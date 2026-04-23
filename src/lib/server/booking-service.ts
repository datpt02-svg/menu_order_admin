import { eq } from "drizzle-orm";

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

export async function saveBooking(input: SaveBookingInput) {
  const zoneId = input.zoneId ?? await findZoneIdBySlug(input.zoneSlug);
  const tableId = input.tableId ?? await findTableIdByCode(input.tableCode);
  const payload = {
    code: input.code?.trim() || buildCode("BK"),
    customerName: input.customerName.trim(),
    customerPhone: input.customerPhone.trim(),
    bookingDate: input.bookingDate.trim(),
    bookingTime: input.bookingTime.trim(),
    guestCount: input.guestCount,
    zoneId,
    tableId,
    status: input.status || "pending",
    depositSlipPath: input.depositSlipPath?.trim() || null,
    depositReviewStatus: input.depositReviewStatus || "not_submitted",
    depositReviewedAt: input.depositReviewedAt ?? null,
    depositReviewNote: input.depositReviewNote?.trim() || null,
    note: input.note?.trim() || null,
    updatedAt: new Date(),
  };

  let bookingId = input.id ?? 0;
  let createdAt: Date | undefined;

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
  broadcastRealtimeEvent(input.id ? REALTIME_EVENTS.bookingUpdated : REALTIME_EVENTS.bookingCreated, {
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
