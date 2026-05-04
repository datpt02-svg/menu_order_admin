import { NextResponse } from "next/server";

import { getAllowedCorsOrigins, getPublicApiBaseUrl } from "@/lib/env";
import { safeUserMenuSections } from "@/lib/server/safe-data";

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

function absolutizeMenuImages(request: Request, sections: Awaited<ReturnType<typeof safeUserMenuSections>>["data"]) {
  const requestOrigin = new URL(request.url).origin;
  const configuredBaseUrl = getPublicApiBaseUrl();
  const baseUrl = (configuredBaseUrl || requestOrigin).replace(/\/$/, "");

  return sections.map((section) => ({
    ...section,
    items: section.items.map((item) => ({
      ...item,
      image: item.image && item.image.startsWith("/") ? `${baseUrl}${item.image}` : item.image,
    })),
  }));
}

export function OPTIONS(request: Request) {
  return withCors(request, new NextResponse(null, { status: 204 }));
}

export async function GET(request: Request) {
  const { data } = await safeUserMenuSections();
  return withCors(request, NextResponse.json({ sections: absolutizeMenuImages(request, data), usingFallback: false }));
}
