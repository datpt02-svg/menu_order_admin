import { NextResponse } from "next/server";
import { z } from "zod";

import { getAllowedCorsOrigins } from "@/lib/env";
import { saveBooking } from "@/lib/server/booking-service";

export const runtime = "nodejs";

function withCors(request: Request, response: NextResponse) {
  const origin = request.headers.get("origin");
  const allowedOrigins = getAllowedCorsOrigins();

  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Vary", "Origin");
  }

  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
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

export function OPTIONS(request: Request) {
  return withCors(request, new NextResponse(null, { status: 204 }));
}

export async function POST(request: Request) {
  const payload = bookingSchema.safeParse(await request.json());
  if (!payload.success) {
    return withCors(request, NextResponse.json({ error: "Invalid booking payload", issues: payload.error.issues }, { status: 400 }));
  }

  const booking = await saveBooking(payload.data);
  return withCors(request, NextResponse.json({ booking }, { status: 201 }));
}
