import { NextResponse } from "next/server";

import { getAllowedCorsOrigins } from "@/lib/env";
import { getZones } from "@/lib/server/queries";

export const runtime = "nodejs";

function withCors(request: Request, response: NextResponse) {
  const origin = request.headers.get("origin");
  const allowedOrigins = getAllowedCorsOrigins();

  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Vary", "Origin");
  }

  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return response;
}

export function OPTIONS(request: Request) {
  return withCors(request, new NextResponse(null, { status: 204 }));
}

export async function GET(request: Request) {
  const rows = await getZones();

  const zones = rows.map((zone) => ({
    id: zone.id,
    name: zone.name,
    slug: zone.slug,
  }));

  return withCors(request, NextResponse.json({ zones }));
}
