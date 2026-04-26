import { and, desc, eq, gte, lte, lt } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db/client";
import { bookingStatusHistory, bookings } from "@/db/schema";
import { getAllowedCorsOrigins } from "@/lib/env";
import { REALTIME_EVENTS, broadcastRealtimeEvent } from "@/lib/server/realtime-events";
import { ActiveBookingConflictError, saveBooking } from "@/lib/server/booking-service";

export const runtime = "nodejs";

function logBookingApi(label: string, data: Record<string, unknown>) {
  console.log(`[booking-api] ${label}`, data);
}

function withCors(request: Request, response: NextResponse) {
  const origin = request.headers.get("origin");
  const allowedOrigins = getAllowedCorsOrigins();

  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Vary", "Origin");
  }

  response.headers.set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return response;
}

const bookingSchema = z.object({
  code: z.string().optional(),
  customerName: z.string().min(1),
  customerPhone: z.string().min(1),
  bookingDate: z.string().min(1),
  bookingTime: z.string().min(1),
  guestCount: z.coerce.number().int().min(1),
  zoneSlug: z.string().optional().nullable(),
  tableCode: z.string().optional().nullable(),
  status: z.enum(["pending", "confirmed", "seated", "completed", "cancelled", "no_show"]).optional(),
  depositSlipPath: z.string().optional().nullable(),
  depositReviewStatus: z.enum(["not_submitted", "submitted", "approved", "rejected"]).optional(),
  depositReviewNote: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
});

const cancelBookingSchema = z.object({
  code: z.string().min(1),
});

function serializeBooking(row: {
  id: number;
  code: string;
  customerName: string;
  customerPhone: string;
  bookingDate: string;
  bookingTime: string;
  guestCount: number;
  status: "pending" | "confirmed" | "seated" | "completed" | "cancelled" | "no_show";
  depositSlipPath: string | null;
  depositReviewStatus: "not_submitted" | "submitted" | "approved" | "rejected";
  depositReviewedAt: Date | null;
  depositReviewNote: string | null;
  note: string | null;
  updatedAt: Date;
}) {
  return {
    ...row,
    depositReviewedAt: row.depositReviewedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function findBookingByCode(code: string) {
  const [booking] = await db
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
    })
    .from(bookings)
    .where(eq(bookings.code, code))
    .limit(1);

  return booking ? serializeBooking(booking) : null;
}

async function findApprovedBookingsByPhone(customerPhone: string, limit: number, before?: string | null, from?: string | null, to?: string | null) {
  const normalizedPhone = customerPhone.replace(/[().\s-]+/g, "").trim();
  if (!normalizedPhone) return [];

  const filters = [eq(bookings.depositReviewStatus, "approved")];

  if (before) {
    const beforeDate = new Date(before);
    if (!Number.isNaN(beforeDate.getTime())) {
      filters.push(lt(bookings.updatedAt, beforeDate));
    }
  }

  if (from) {
    filters.push(gte(bookings.bookingDate, from));
  }

  if (to) {
    filters.push(lte(bookings.bookingDate, to));
  }

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
    })
    .from(bookings)
    .where(and(...filters))
    .orderBy(desc(bookings.depositReviewedAt), desc(bookings.updatedAt), desc(bookings.bookingDate), desc(bookings.bookingTime))
    .limit(Math.max(1, Math.min(limit, 20)));

  return rows
    .filter((row) => row.customerPhone.replace(/[().\s-]+/g, "").trim() === normalizedPhone)
    .map((row) => serializeBooking(row));
}

async function cancelBookingByCode(code: string) {
  const [existingBooking] = await db
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
    })
    .from(bookings)
    .where(eq(bookings.code, code))
    .limit(1);

  if (!existingBooking) {
    return null;
  }

  if (existingBooking.status === "confirmed" || existingBooking.status === "seated" || existingBooking.status === "completed") {
    const updatedAt = new Date();
    const [booking] = await db
      .update(bookings)
      .set({ status: "cancelled", updatedAt })
      .where(eq(bookings.id, existingBooking.id))
      .returning({
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
      });

    if (!booking) {
      return null;
    }

    await db.insert(bookingStatusHistory).values({
      bookingId: booking.id,
      status: "cancelled",
      note: "Cancelled by customer",
    });

    broadcastRealtimeEvent(REALTIME_EVENTS.bookingUpdated, {
      id: booking.id,
      code: booking.code,
      status: booking.status,
      customerName: booking.customerName,
      bookingDate: booking.bookingDate,
      bookingTime: booking.bookingTime,
      updatedAt: booking.updatedAt.toISOString(),
    });

    return {
      outcome: "cancelled" as const,
      booking: serializeBooking(booking),
    };
  }

  await db.delete(bookings).where(eq(bookings.id, existingBooking.id));

  broadcastRealtimeEvent(REALTIME_EVENTS.bookingDeleted, {
    id: existingBooking.id,
    code: existingBooking.code,
    status: "deleted",
    customerName: existingBooking.customerName,
    bookingDate: existingBooking.bookingDate,
    bookingTime: existingBooking.bookingTime,
    deletedAt: new Date().toISOString(),
    source: "user_cancel_before_confirmation",
    updatedAt: existingBooking.updatedAt.toISOString(),
  });

  return {
    outcome: "deleted" as const,
    booking: serializeBooking(existingBooking),
  };
}

export function OPTIONS(request: Request) {
  return withCors(request, new NextResponse(null, { status: 204 }));
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")?.trim();
  const customerPhone = request.nextUrl.searchParams.get("customerPhone")?.trim();
  const history = request.nextUrl.searchParams.get("history")?.trim();

  if (history === "approved") {
    const limit = Number(request.nextUrl.searchParams.get("limit") || 5);
    const before = request.nextUrl.searchParams.get("before")?.trim() || null;
    const from = request.nextUrl.searchParams.get("from")?.trim() || null;
    const to = request.nextUrl.searchParams.get("to")?.trim() || null;

    logBookingApi("GET:history:start", {
      customerPhone: customerPhone || "",
      limit,
      before: before || "",
      from: from || "",
      to: to || "",
    });

    if (!customerPhone) {
      logBookingApi("GET:history:missing-phone", {});
      return withCors(request, NextResponse.json({ error: "Missing customer phone" }, { status: 400 }));
    }

    const bookings = await findApprovedBookingsByPhone(customerPhone, limit, before, from, to);
    const nextCursor = bookings.length === Math.max(1, Math.min(limit, 20)) ? (bookings.at(-1)?.updatedAt ?? null) : null;

    logBookingApi("GET:history:done", {
      customerPhone,
      count: bookings.length,
      nextCursor: nextCursor || "",
    });

    return withCors(request, NextResponse.json({ bookings, nextCursor }, { status: 200 }));
  }

  logBookingApi("GET:start", { code: code || "" });
  if (!code) {
    logBookingApi("GET:missing-code", {});
    return withCors(request, NextResponse.json({ error: "Missing booking code" }, { status: 400 }));
  }

  const booking = await findBookingByCode(code);
  if (!booking) {
    logBookingApi("GET:not-found", { code });
    return withCors(request, NextResponse.json({ error: "Booking not found" }, { status: 404 }));
  }

  logBookingApi("GET:found", {
    code,
    status: booking.status,
    depositReviewStatus: booking.depositReviewStatus,
  });
  return withCors(request, NextResponse.json({ booking }, { status: 200 }));
}

export async function DELETE(request: Request) {
  const rawBody = await request.json();
  const payload = cancelBookingSchema.safeParse(rawBody);
  logBookingApi("DELETE:start", { code: rawBody?.code || "" });
  if (!payload.success) {
    logBookingApi("DELETE:invalid", { issues: payload.error.issues.length });
    return withCors(request, NextResponse.json({ error: "Invalid cancel payload", issues: payload.error.issues }, { status: 400 }));
  }

  const result = await cancelBookingByCode(payload.data.code);
  if (!result) {
    logBookingApi("DELETE:not-found", { code: payload.data.code });
    return withCors(request, NextResponse.json({ error: "Booking not found" }, { status: 404 }));
  }

  logBookingApi("DELETE:done", { code: payload.data.code, outcome: result.outcome });
  return withCors(request, NextResponse.json(result, { status: 200 }));
}

export async function POST(request: Request) {
  const rawBody = await request.json();
  const payload = bookingSchema.safeParse(rawBody);
  logBookingApi("POST:start", {
    code: rawBody?.code || "",
    customerPhone: rawBody?.customerPhone || "",
    depositReviewStatus: rawBody?.depositReviewStatus || "",
    hasDepositSlipPath: Boolean(rawBody?.depositSlipPath),
  });
  if (!payload.success) {
    logBookingApi("POST:invalid", { issues: payload.error.issues.length });
    return withCors(request, NextResponse.json({ error: "Invalid booking payload", issues: payload.error.issues }, { status: 400 }));
  }

  try {
    const booking = await saveBooking(payload.data);
    logBookingApi("POST:created", {
      code: booking.code,
      status: booking.status,
      depositReviewStatus: booking.depositReviewStatus,
    });
    return withCors(request, NextResponse.json({ booking }, { status: 201 }));
  } catch (error) {
    if (error instanceof ActiveBookingConflictError) {
      logBookingApi("POST:conflict", {
        code: rawBody?.code || "",
        existingCode: error.booking.code,
        existingStatus: error.booking.status,
        existingDepositReviewStatus: error.booking.depositReviewStatus,
      });
      return withCors(
        request,
        NextResponse.json(
          {
            error: "Active booking already exists",
            code: "ACTIVE_BOOKING_CONFLICT",
            booking: serializeBooking(error.booking),
          },
          { status: 409 },
        ),
      );
    }

    logBookingApi("POST:error", {
      code: rawBody?.code || "",
      message: error instanceof Error ? error.message : "unknown-error",
    });
    throw error;
  }
}
