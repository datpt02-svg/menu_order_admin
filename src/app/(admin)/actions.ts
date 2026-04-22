"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { bookingStatusHistory, bookings, services, tables, zones } from "@/db/schema";

function valueOf(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalValue(formData: FormData, key: string) {
  const value = valueOf(formData, key);
  return value || null;
}

function numberValue(formData: FormData, key: string, fallback = 0) {
  const value = Number(valueOf(formData, key));
  return Number.isFinite(value) ? value : fallback;
}

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

async function findZoneIdBySlug(slug: string) {
  if (!slug || slug === "all") return null;
  const row = await db.select({ id: zones.id }).from(zones).where(eq(zones.slug, slug)).limit(1);
  return row[0]?.id ?? null;
}

async function findTableIdByCode(code: string) {
  if (!code) return null;
  const row = await db.select({ id: tables.id }).from(tables).where(eq(tables.code, code)).limit(1);
  return row[0]?.id ?? null;
}

export async function saveBookingAction(formData: FormData) {
  const id = numberValue(formData, "id");
  const status = valueOf(formData, "status") as typeof bookings.$inferInsert.status;
  const payload = {
    code: valueOf(formData, "code") || buildCode("BK"),
    customerName: valueOf(formData, "customerName"),
    customerPhone: valueOf(formData, "customerPhone"),
    bookingDate: valueOf(formData, "bookingDate"),
    bookingTime: valueOf(formData, "bookingTime"),
    guestCount: numberValue(formData, "guestCount", 1),
    zoneId: await findZoneIdBySlug(valueOf(formData, "zoneSlug")),
    tableId: await findTableIdByCode(valueOf(formData, "tableCode")),
    status: status || "pending",
    note: optionalValue(formData, "note"),
    updatedAt: new Date(),
  };

  if (id) {
    await db.update(bookings).set(payload).where(eq(bookings.id, id));
    await db.insert(bookingStatusHistory).values({ bookingId: id, status: payload.status, note: payload.note });
  } else {
    const inserted = await db.insert(bookings).values(payload).returning({ id: bookings.id });
    const bookingId = inserted[0]?.id;
    if (bookingId) {
      await db.insert(bookingStatusHistory).values({ bookingId, status: payload.status, note: payload.note });
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/bookings");
  revalidatePath("/calendar");
}

export async function saveServiceAction(formData: FormData) {
  const id = numberValue(formData, "id");
  const name = valueOf(formData, "name");
  const payload = {
    name,
    slug: valueOf(formData, "slug") || slugify(name) || buildCode("service").toLowerCase(),
    category: valueOf(formData, "category") || "Dịch vụ",
    description: optionalValue(formData, "description"),
    priceLabel: valueOf(formData, "priceLabel") || "Liên hệ",
    imagePath: optionalValue(formData, "imagePath"),
    visible: valueOf(formData, "visible") !== "hidden",
    sortOrder: numberValue(formData, "sortOrder", 0),
    updatedAt: new Date(),
  };

  if (id) {
    await db.update(services).set(payload).where(eq(services.id, id));
  } else {
    await db.insert(services).values(payload);
  }

  revalidatePath("/dashboard");
  revalidatePath("/services");
}

export async function deleteServiceAction(formData: FormData) {
  const id = numberValue(formData, "id");
  if (!id) return;

  await db.delete(services).where(eq(services.id, id));
  revalidatePath("/dashboard");
  revalidatePath("/services");
}

