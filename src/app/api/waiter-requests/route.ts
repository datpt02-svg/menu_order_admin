import { NextResponse } from "next/server";
import { z } from "zod";

import { getAllowedCorsOrigins } from "@/lib/env";
import { saveWaiterRequest } from "@/lib/server/booking-service";

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

const waiterRequestSchema = z.object({
  code: z.string().optional(),
  zoneSlug: z.string().optional().nullable(),
  tableCode: z.string().optional().nullable(),
  need: z.string().min(1),
  note: z.string().optional().nullable(),
  status: z.enum(["new", "in_progress", "done"]).optional(),
});

export function OPTIONS(request: Request) {
  return withCors(request, new NextResponse(null, { status: 204 }));
}

export async function POST(request: Request) {
  const payload = waiterRequestSchema.safeParse(await request.json());
  if (!payload.success) {
    return withCors(request, NextResponse.json({ error: "Invalid waiter request payload", issues: payload.error.issues }, { status: 400 }));
  }

  const waiterRequest = await saveWaiterRequest(payload.data);
  return withCors(request, NextResponse.json({ waiterRequest }, { status: 201 }));
}
