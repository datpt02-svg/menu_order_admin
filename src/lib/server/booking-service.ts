import { eq, ne } from "drizzle-orm";

import { db } from "@/db/client";
import { bookingStatusHistory, bookings, tables, waiterRequestEvents, waiterRequests, zones } from "@/db/schema";
import { REALTIME_EVENTS, broadcastRealtimeEvent } from "@/lib/server/realtime-events";

function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 160);
}

function buildCode(prefix: string) {
  return `${prefix}-${Date.now()}`;
}

async function findZoneIdBySlug(slug?: string | null) {
  if (!slug || slug === "all") return null;
  const row = await db.select({ id: zones.id }).from(zones).where(eq(zones.slug, slug)).limit(1);
  return row[0]?.id ?? null;
}

async function findTableIdByCode(code?: string | null) {
  if (!code) return null;
  const normalizedCode = code.trim();
  if (!normalizedCode) return null;
  const row = await db.select({ id: tables.id }).from(tables).where(eq(tables.code, normalizedCode)).limit(1);
  return row[0]?.id ?? null;
}

async function enrichLocation(zoneId: number | null, tableId: number | null) {
  const [zone, table] = await Promise.all([
    zoneId ? db.select({ name: zones.name }).from(zones).where(eq(zones.id, zoneId)).limit(1) : Promise.resolve([]),
    tableId ? db.select({ code: tables.code }).from(tables).where(eq(tables.id, tableId)).limit(1) : Promise.resolve([]),
  ]);

  return {
    zoneName: zone[0]?.name ?? null,
    tableCode: table[0]?.code ?? null,
  };
}

export type SaveBookingInput = {
  id?: number;
  code?: string;
  customerName: string;
  customerPhone: string;
  bookingDate: string;
  bookingTime: string;
  guestCount: number;
  zoneId?: number | null;
  zoneSlug?: string | null;
  tableId?: number | null;
  tableCode?: string | null;
  status?: typeof bookings.$inferInsert.status;
  depositSlipPath?: string | null;
  depositReviewStatus?: typeof bookings.$inferInsert.depositReviewStatus;
  depositReviewedAt?: Date | null;
  depositReviewNote?: string | null;
  note?: string | null;
};

export class ActiveBookingConflictError extends Error {
  booking: {
    id: number;
    code: string;
    customerName: string;
    customerPhone: string;
    bookingDate: string;
    bookingTime: string;
    guestCount: number;
    status: typeof bookings.$inferSelect.status;
    depositSlipPath: string | null;
    depositReviewStatus: typeof bookings.$inferSelect.depositReviewStatus;
    depositReviewedAt: Date | null;
    depositReviewNote: string | null;
    note: string | null;
    updatedAt: Date;
    zoneName: string | null;
    tableCode: string | null;
  };

  constructor(booking: ActiveBookingConflictError["booking"]) {
    super("active-booking-conflict");
    this.name = "ActiveBookingConflictError";
    this.booking = booking;
  }
}

function normalizePhone(value: string) {
  return value.replace(/[().\s-]+/g, "").trim();
}

function looksLikeServerLog(value?: string | null) {
  const text = String(value || "");
  return text.includes("[booking-api]") || text.includes("OPTIONS /api/bookings") || text.includes("POST /api/bookings") || text.includes("GET /api/bookings");
}

function sanitizeBookingText(value: string | null | undefined, maxLength: number) {
  const text = String(value || "").trim();
  if (!text || looksLikeServerLog(text)) return null;
  return text.slice(0, maxLength);
}

function sanitizeRequiredBookingText(value: string | null | undefined, maxLength: number) {
  return sanitizeBookingText(value, maxLength) || "";
}

function sanitizeBookingCode(value?: string | null) {
  const text = String(value || "").trim().toUpperCase();
  if (!/^SAM-[A-Z0-9]{4,}$/.test(text)) return null;
  return text.slice(0, 80);
}

function sanitizeBookingDate(value: string | null | undefined) {
  const text = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function sanitizeBookingTime(value: string | null | undefined) {
  const text = String(value || "").trim();
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(text) ? text : "";
}

function sanitizeDepositPath(value: string | null | undefined) {
  const text = String(value || "").trim();
  if (!text || looksLikeServerLog(text)) return null;
  return text.slice(0, 500);
}

function sanitizeGuestCount(value: number) {
  return Number.isInteger(value) && value > 0 ? value : 1;
}

function sanitizeBookingSaveInput(input: SaveBookingInput) {
  const cleaned = {
    id: input.id ?? 0,
    code: sanitizeBookingCode(input.code) || String(input.code || "").trim() || null,
    customerName: sanitizeRequiredBookingText(input.customerName, 160),
    customerPhone: sanitizeRequiredBookingText(input.customerPhone, 40),
    bookingDate: sanitizeBookingDate(input.bookingDate),
    bookingTime: sanitizeBookingTime(input.bookingTime),
    guestCount: sanitizeGuestCount(input.guestCount),
    zoneId: input.zoneId ?? null,
    zoneSlug: (() => {
      const text = String(input.zoneSlug || "").trim();
      return text && !looksLikeServerLog(text) ? text : null;
    })(),
    tableId: input.tableId ?? null,
    tableCode: (() => {
      const text = String(input.tableCode || "").trim().toUpperCase();
      return text && !looksLikeServerLog(text) ? text : null;
    })(),
    status: input.status || "pending",
    depositSlipPath: sanitizeDepositPath(input.depositSlipPath),
    depositReviewStatus: input.depositReviewStatus || "not_submitted",
    depositReviewedAt: input.depositReviewedAt ?? null,
    depositReviewNote: sanitizeBookingText(input.depositReviewNote, 1000),
    note: sanitizeBookingText(input.note, 1000),
  };

  if (!cleaned.customerName || !cleaned.customerPhone || !cleaned.bookingDate || !cleaned.bookingTime) {
    throw new Error("invalid-booking-input");
  }

  return cleaned;
}

function getResolvedInput(input: SaveBookingInput) {
  return sanitizeBookingSaveInput(input);
}

function isBookingBlockingNewCreate(booking: {
  status: typeof bookings.$inferSelect.status;
  depositReviewStatus: typeof bookings.$inferSelect.depositReviewStatus;
}) {
  return booking.status === "pending" && booking.depositReviewStatus === "submitted";
}

async function findBlockingBookingByPhone(customerPhone: string, currentBookingId?: number) {
  const normalizedPhone = normalizePhone(customerPhone);
  if (!normalizedPhone) return null;

  const rows = await db
    .select({
      id: bookings.id,
      code: bookings.code,
      customerName: bookings.customerName,
      customerPhone: bookings.customerPhone,
      bookingDate: bookings.bookingDate,
      bookingTime: bookings.bookingTime,
      guestCount: bookings.guestCount,
      status: bookings.status,
      depositSlipPath: bookings.depositSlipPath,
      depositReviewStatus: bookings.depositReviewStatus,
      depositReviewedAt: bookings.depositReviewedAt,
      depositReviewNote: bookings.depositReviewNote,
      note: bookings.note,
      updatedAt: bookings.updatedAt,
      zoneName: zones.name,
      tableCode: tables.code,
    })
    .from(bookings)
    .leftJoin(zones, eq(bookings.zoneId, zones.id))
    .leftJoin(tables, eq(bookings.tableId, tables.id))
    .where(currentBookingId ? ne(bookings.id, currentBookingId) : undefined)
    .orderBy(bookings.updatedAt);

  return rows.find((row) => normalizePhone(row.customerPhone) === normalizedPhone && isBookingBlockingNewCreate(row)) ?? null;
}

export async function saveBooking(input: SaveBookingInput) {
  const cleaned = getResolvedInput(input);
  let existingBookingId = cleaned.id ?? 0;

  if (!existingBookingId && cleaned.code) {
    const existingRows = await db.select({ id: bookings.id }).from(bookings).where(eq(bookings.code, cleaned.code)).limit(1);
    existingBookingId = existingRows[0]?.id ?? 0;
  }

  if (!existingBookingId) {
    const blockingBooking = await findBlockingBookingByPhone(cleaned.customerPhone);
    if (blockingBooking) {
      throw new ActiveBookingConflictError(blockingBooking);
    }
  }

  const zoneId = cleaned.zoneId ?? await findZoneIdBySlug(cleaned.zoneSlug);
  const tableId = cleaned.tableId ?? await findTableIdByCode(cleaned.tableCode);
  const payload = {
    code: cleaned.code || buildCode("BK"),
    customerName: cleaned.customerName,
    customerPhone: cleaned.customerPhone,
    bookingDate: cleaned.bookingDate,
    bookingTime: cleaned.bookingTime,
    guestCount: cleaned.guestCount,
    zoneId,
    tableId,
    status: cleaned.status,
    depositSlipPath: cleaned.depositSlipPath,
    depositReviewStatus: cleaned.depositReviewStatus,
    depositReviewedAt: cleaned.depositReviewedAt,
    depositReviewNote: cleaned.depositReviewNote,
    note: cleaned.note,
    updatedAt: new Date(),
  };

  let bookingId = existingBookingId;
  let createdAt: Date | undefined;
  const isExistingBooking = Boolean(bookingId);

  if (bookingId) {
    await db.update(bookings).set(payload).where(eq(bookings.id, bookingId));
    await db.insert(bookingStatusHistory).values({ bookingId, status: payload.status, note: payload.note });
  } else {
    const inserted = await db
      .insert(bookings)
      .values(payload)
      .returning({ id: bookings.id, createdAt: bookings.createdAt });
    bookingId = inserted[0]?.id ?? 0;
    createdAt = inserted[0]?.createdAt;
    if (bookingId) {
      await db.insert(bookingStatusHistory).values({ bookingId, status: payload.status, note: payload.note });
    }
  }

  const location = await enrichLocation(zoneId, tableId);
  broadcastRealtimeEvent(isExistingBooking ? REALTIME_EVENTS.bookingUpdated : REALTIME_EVENTS.bookingCreated, {
    id: bookingId,
    code: payload.code,
    status: payload.status,
    zoneName: location.zoneName,
    tableCode: location.tableCode,
    createdAt: (createdAt ?? new Date()).toISOString(),
    updatedAt: payload.updatedAt.toISOString(),
  });

  return { id: bookingId, ...payload, ...location };
}

export type SaveWaiterRequestInput = {
  id?: number;
  code?: string;
  zoneId?: number | null;
  zoneSlug?: string | null;
  tableId?: number | null;
  tableCode?: string | null;
  need: string;
  note?: string | null;
  status?: typeof waiterRequests.$inferInsert.status;
};

export async function saveWaiterRequest(input: SaveWaiterRequestInput) {
  const zoneId = input.zoneId ?? await findZoneIdBySlug(input.zoneSlug);
  const tableId = input.tableId ?? await findTableIdByCode(input.tableCode);
  const payload = {
    code: input.code?.trim() || buildCode("WR"),
    zoneId,
    tableId,
    need: input.need.trim(),
    note: input.note?.trim() || null,
    status: input.status || "new",
    updatedAt: new Date(),
  };

  let waiterRequestId = input.id ?? 0;
  let createdAt: Date | undefined;

  if (waiterRequestId) {
    await db.update(waiterRequests).set(payload).where(eq(waiterRequests.id, waiterRequestId));
    await db.insert(waiterRequestEvents).values({ waiterRequestId, status: payload.status, note: payload.note });
  } else {
    const inserted = await db
      .insert(waiterRequests)
      .values(payload)
      .returning({ id: waiterRequests.id, createdAt: waiterRequests.createdAt });
    waiterRequestId = inserted[0]?.id ?? 0;
    createdAt = inserted[0]?.createdAt;
    if (waiterRequestId) {
      await db.insert(waiterRequestEvents).values({ waiterRequestId, status: payload.status, note: payload.note });
    }
  }

  const location = await enrichLocation(zoneId, tableId);
  broadcastRealtimeEvent(input.id ? REALTIME_EVENTS.waiterRequestUpdated : REALTIME_EVENTS.waiterRequestCreated, {
    id: waiterRequestId,
    code: payload.code,
    status: payload.status,
    zoneName: location.zoneName,
    tableCode: location.tableCode,
    createdAt: (createdAt ?? new Date()).toISOString(),
    updatedAt: payload.updatedAt.toISOString(),
  });

  return { id: waiterRequestId, ...payload, ...location };
}

export function buildServiceSlug(name: string, providedSlug?: string) {
  return providedSlug?.trim() || slugify(name) || buildCode("service").toLowerCase();
}
