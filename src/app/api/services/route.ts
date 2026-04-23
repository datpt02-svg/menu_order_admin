import { NextResponse } from "next/server";

import { getAllowedCorsOrigins } from "@/lib/env";
import { getBookingServices } from "@/lib/server/queries";

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

function pickLocalizedValue(
  locale: string,
  localized: Record<string, string> | null | undefined,
  fallback: string | null | undefined,
) {
  return localized?.[locale] || localized?.en || fallback || "";
}

export function OPTIONS(request: Request) {
  return withCors(request, new NextResponse(null, { status: 204 }));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const locale = searchParams.get("locale") || "vi";
  const services = await getBookingServices();

  const payload = services.map((service) => ({
    id: service.slug,
    title: pickLocalizedValue(locale, service.nameI18n, service.name),
    description: pickLocalizedValue(locale, service.descriptionI18n, service.description),
    price: pickLocalizedValue(locale, service.priceLabelI18n, service.priceLabel),
    zoneSlug: service.zoneSlug || null,
  }));

  return withCors(request, NextResponse.json({ services: payload }));
}
