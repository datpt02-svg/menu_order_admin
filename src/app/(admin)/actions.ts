"use server";

import { revalidatePath } from "next/cache";
import { and, asc, desc, eq, gte, lte, ne, sql } from "drizzle-orm";

import { db } from "@/db/client";
import {
  bookingConfigs,
  bookingStatusHistory,
  bookings,
  menuItems,
  menuSections,
  services,
  staffAssignmentEvents,
  staffAssignments,
  staffMembers,
  staffShifts,
  tables,
  waiterRequests,
  zones,
} from "@/db/schema";
import { saveBooking, saveWaiterRequest } from "@/lib/server/booking-service";
import { ensureMenuCatalogTables } from "@/lib/server/menu-catalog-db";
import { getMenuCatalogLocales, loadMenuCatalogSource } from "@/lib/server/menu-catalog-source";
import { getMenuSections } from "@/lib/server/queries";

function valueOf(formData: FormData, key: string) {
  const directValue = formData.get(key);
  if (typeof directValue === "string") return directValue.trim();

  for (const [entryKey, entryValue] of formData.entries()) {
    if (entryKey === key || entryKey.endsWith(`_${key}`)) {
      return typeof entryValue === "string" ? entryValue.trim() : "";
    }
  }

  return "";
}

function optionalValue(formData: FormData, key: string) {
  const value = valueOf(formData, key);
  return value || null;
}

function numberValue(formData: FormData, key: string, fallback = 0) {
  const value = Number(valueOf(formData, key));
  return Number.isFinite(value) ? value : fallback;
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

async function findShiftIdByLabel(shiftDate: string, label: string) {
  if (!shiftDate || !label) return null;

  const rows = await db
    .select({ id: staffShifts.id, label: staffShifts.label })
    .from(staffShifts)
    .where(eq(staffShifts.shiftDate, shiftDate))
    .limit(50);

  return rows.find((row) => row.label === label)?.id ?? null;
}

async function findShiftIdByWindow(shiftDate: string, startTime: string, endTime: string, label: string) {
  if (!shiftDate || !startTime || !endTime || !label) return null;

  const rows = await db.select().from(staffShifts).where(eq(staffShifts.shiftDate, shiftDate)).limit(100);
  return rows.find((row) => row.startTime === startTime && row.endTime === endTime && row.label === label)?.id ?? null;
}

async function resolveShiftForAssignmentMove({
  currentShift,
  shiftDate,
  startTime,
  endTime,
  shiftLabel,
  zoneId,
}: {
  currentShift: typeof staffShifts.$inferSelect;
  shiftDate: string;
  startTime: string;
  endTime: string;
  shiftLabel: string;
  zoneId: number | null;
}) {
  const existingShiftId = await findShiftIdByWindow(shiftDate, startTime, endTime, shiftLabel);
  if (existingShiftId) return existingShiftId;

  const inserted = await db.insert(staffShifts).values({
    shiftDate,
    startTime,
    endTime,
    label: shiftLabel,
    zoneId,
    headcountRequired: currentShift.headcountRequired,
    notes: currentShift.notes,
    updatedAt: new Date(),
  }).returning({ id: staffShifts.id });

  return inserted[0]?.id ?? null;
}

function isTruthyValue(value: string) {
  return value === "true" || value === "1" || value === "on" || value === "active";
}

type ValidationResult = {
  ok: boolean;
  fieldErrors?: Record<string, string>;
  formError?: string;
};

const VALID_SERVICE_CATEGORIES = new Set(["BBQ", "Cafe", "Dịch vụ", "Sự kiện"]);
const VALID_BOOKING_STATUSES = new Set(["pending", "confirmed", "seated", "completed", "cancelled", "no_show"]);
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const IMAGE_PATH_PATTERN = /^(\/[^\s]+|https?:\/\/[^\s]+)$/i;
const PHONE_ALLOWED_PATTERN = /^[0-9+().\s-]+$/;

type ServiceValidationPayload = {
  name: string;
  slug: string;
  category: string;
  description: string | null;
  priceLabel: string;
  imagePath: string | null;
  visible: boolean;
  bookingEnabled: boolean;
  zoneSlug: string | null;
  nameI18n: Record<string, string> | null;
  descriptionI18n: Record<string, string> | null;
  priceLabelI18n: Record<string, string> | null;
  sortOrder: number;
  updatedAt: Date;
};

type BookingValidationPayload = {
  id?: number;
  code?: string;
  customerName: string;
  customerPhone: string;
  bookingDate: string;
  bookingTime: string;
  guestCount: number;
  zoneSlug: string | null;
  tableCode: string | null;
  status?: typeof bookings.$inferInsert.status;
  depositSlipPath?: string | null;
  depositReviewStatus?: typeof bookings.$inferInsert.depositReviewStatus;
  depositReviewedAt?: Date | null;
  depositReviewNote?: string | null;
  note: string | null;
};

type BookingConfigValidationPayload = {
  depositAmount: number;
  bankName: string;
  bankCode: string;
  accountNumber: string;
  phone: string;
  updatedAt: Date;
};

type ZoneValidationPayload = {
  name: string;
  slug: string;
};

type TableValidationPayload = {
  code: string;
  zoneId: number | null;
  seats: number;
  status: typeof tables.$inferInsert.status;
};

type MenuSectionValidationPayload = {
  slug: string;
  titleI18n: Record<string, string>;
  descriptionI18n: Record<string, string>;
  visible: boolean;
  sortOrder: number;
  updatedAt: Date;
};

type MenuItemValidationPayload = {
  sectionId: number;
  slug: string;
  nameI18n: Record<string, string>;
  noteI18n: Record<string, string>;
  descriptionI18n: Record<string, string>;
  priceLabel: string;
  imagePath: string | null;
  visible: boolean;
  sortOrder: number;
  updatedAt: Date;
};

const SERVICE_ORDER_PARKED_VALUE = 0;
const MENU_ORDER_PARKED_VALUE = 0;
const MENU_CATALOG_PATHS = ["/menu", "/api/menu-catalog"] as const;

function clampServicePosition(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

async function listServiceSortSnapshot(executor: typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0]) {
  return executor
    .select({ id: services.id, sortOrder: services.sortOrder })
    .from(services)
    .orderBy(asc(services.sortOrder), asc(services.name), asc(services.id));
}

async function normalizeServiceSortOrder(executor: typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0]) {
  const rows = await listServiceSortSnapshot(executor);
  const updates = rows.flatMap((row, index) => {
    const nextSortOrder = index + 1;
    if (row.sortOrder === nextSortOrder) return [];
    return [{ id: row.id, sortOrder: nextSortOrder }];
  });

  if (updates.length === 0) {
    return rows.map((row, index) => ({ id: row.id, sortOrder: index + 1 }));
  }

  for (const update of updates) {
    await executor
      .update(services)
      .set({ sortOrder: update.sortOrder, updatedAt: new Date() })
      .where(eq(services.id, update.id));
  }

  return rows.map((row, index) => ({ id: row.id, sortOrder: index + 1 }));
}

async function shiftServiceOrder(
  executor: Parameters<Parameters<typeof db.transaction>[0]>[0],
  payload: ServiceValidationPayload,
  serviceId?: number,
) {
  const normalizedRows = await normalizeServiceSortOrder(executor);
  const currentCount = normalizedRows.length;
  const requestedSortOrder = Number.isInteger(payload.sortOrder) ? payload.sortOrder : currentCount + 1;

  if (!serviceId) {
    const targetSortOrder = clampServicePosition(requestedSortOrder || currentCount + 1, 1, currentCount + 1);

    await executor
      .update(services)
      .set({ sortOrder: sql`${services.sortOrder} + 1`, updatedAt: new Date() })
      .where(gte(services.sortOrder, targetSortOrder));

    await executor.insert(services).values({ ...payload, sortOrder: targetSortOrder });
    return;
  }

  const currentRow = normalizedRows.find((row) => row.id === serviceId);
  if (!currentRow) {
    throw new Error("service-not-found");
  }

  const targetSortOrder = clampServicePosition(requestedSortOrder || currentRow.sortOrder, 1, currentCount);
  const nextPayload = { ...payload, sortOrder: targetSortOrder };

  if (targetSortOrder === currentRow.sortOrder) {
    await executor.update(services).set(nextPayload).where(eq(services.id, serviceId));
    return;
  }

  await executor
    .update(services)
    .set({ sortOrder: SERVICE_ORDER_PARKED_VALUE, updatedAt: new Date() })
    .where(eq(services.id, serviceId));

  if (targetSortOrder < currentRow.sortOrder) {
    await executor
      .update(services)
      .set({ sortOrder: sql`${services.sortOrder} + 1`, updatedAt: new Date() })
      .where(and(gte(services.sortOrder, targetSortOrder), lte(services.sortOrder, currentRow.sortOrder - 1)));
  } else {
    await executor
      .update(services)
      .set({ sortOrder: sql`${services.sortOrder} - 1`, updatedAt: new Date() })
      .where(and(gte(services.sortOrder, currentRow.sortOrder + 1), lte(services.sortOrder, targetSortOrder)));
  }

  await executor.update(services).set(nextPayload).where(eq(services.id, serviceId));
}

async function deleteAndCompactServiceOrder(executor: Parameters<Parameters<typeof db.transaction>[0]>[0], serviceId: number) {
  const normalizedRows = await normalizeServiceSortOrder(executor);
  const currentRow = normalizedRows.find((row) => row.id === serviceId);
  if (!currentRow) return;

  await executor.delete(services).where(eq(services.id, serviceId));
  await executor
    .update(services)
    .set({ sortOrder: sql`${services.sortOrder} - 1`, updatedAt: new Date() })
    .where(gte(services.sortOrder, currentRow.sortOrder + 1));
}

function buildValidationResult(fieldErrors: Record<string, string>, formError?: string): ValidationResult {
  return {
    ok: false,
    fieldErrors,
    formError,
  };
}

function trimOptionalString(value: string, maxLength: number) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function normalizePhone(value: string) {
  return value.replace(/[().\s-]+/g, "").trim();
}

function slugifyMenuValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function isValidDateString(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00`);
  return !Number.isNaN(parsed.getTime());
}

function isValidTimeString(value: string) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

function buildRequiredI18n(formData: FormData, prefix: string, maxLength: number, fallbackField: string) {
  const locales = getMenuCatalogLocales();
  const baseValue = trimOptionalString(valueOf(formData, fallbackField), maxLength) || "";
  const normalized = Object.fromEntries(
    locales.map((locale) => {
      const value = trimOptionalString(valueOf(formData, `${prefix}_${locale}`), maxLength);
      return [locale, locale === "vi" ? baseValue || value : value || ""];
    }),
  ) as Record<string, string>;

  if (!normalized.vi) {
    normalized.vi = baseValue;
  }

  return normalized;
}

function revalidateMenuCatalogPaths() {
  for (const pathname of MENU_CATALOG_PATHS) {
    revalidatePath(pathname);
  }
}

async function getNextMenuSectionSortOrder() {
  const rows = await db.select({ sortOrder: menuSections.sortOrder }).from(menuSections).orderBy(desc(menuSections.sortOrder)).limit(1);
  return (rows[0]?.sortOrder || 0) + 1;
}

async function getNextMenuItemSortOrder(sectionId: number) {
  const rows = await db.select({ sortOrder: menuItems.sortOrder }).from(menuItems).where(eq(menuItems.sectionId, sectionId)).orderBy(desc(menuItems.sortOrder)).limit(1);
  return (rows[0]?.sortOrder || 0) + 1;
}

async function normalizeMenuSectionSortOrder(executor: typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0]) {
  const rows = await executor
    .select({ id: menuSections.id, sortOrder: menuSections.sortOrder })
    .from(menuSections)
    .orderBy(asc(menuSections.sortOrder), asc(menuSections.slug), asc(menuSections.id));

  for (const [index, row] of rows.entries()) {
    const nextSortOrder = index + 1;
    if (row.sortOrder === nextSortOrder) continue;
    await executor.update(menuSections).set({ sortOrder: nextSortOrder, updatedAt: new Date() }).where(eq(menuSections.id, row.id));
  }

  return rows.map((row, index) => ({ id: row.id, sortOrder: index + 1 }));
}

async function normalizeMenuItemSortOrder(executor: typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0], sectionId: number) {
  const rows = await executor
    .select({ id: menuItems.id, sortOrder: menuItems.sortOrder })
    .from(menuItems)
    .where(eq(menuItems.sectionId, sectionId))
    .orderBy(asc(menuItems.sortOrder), asc(menuItems.slug), asc(menuItems.id));

  for (const [index, row] of rows.entries()) {
    const nextSortOrder = index + 1;
    if (row.sortOrder === nextSortOrder) continue;
    await executor.update(menuItems).set({ sortOrder: nextSortOrder, updatedAt: new Date() }).where(eq(menuItems.id, row.id));
  }

  return rows.map((row, index) => ({ id: row.id, sortOrder: index + 1 }));
}

async function validateMenuSectionForm(formData: FormData): Promise<{ result: ValidationResult; payload?: MenuSectionValidationPayload; id: number }> {
  const id = numberValue(formData, "id");
  const titleI18n = buildRequiredI18n(formData, "titleI18n", 160, "titleVi");
  const slug = (valueOf(formData, "slug") || slugifyMenuValue(titleI18n.vi)).toLowerCase();
  const descriptionI18n = buildRequiredI18n(formData, "descriptionI18n", 2000, "descriptionVi");
  const sortOrderValue = numberValue(formData, "sortOrder");
  const sortOrder = sortOrderValue >= 1 ? sortOrderValue : (await getNextMenuSectionSortOrder());
  const fieldErrors: Record<string, string> = {};

  if (!titleI18n.vi || titleI18n.vi.length < 2) fieldErrors.titleVi = "Tên nhóm món phải có ít nhất 2 ký tự.";
  if (!slug) {
    fieldErrors.slug = "Slug là bắt buộc.";
  } else if (!SLUG_PATTERN.test(slug)) {
    fieldErrors.slug = "Slug chỉ được chứa chữ thường, số và dấu gạch ngang.";
  }

  if (!fieldErrors.slug) {
    const duplicate = await db
      .select({ id: menuSections.id })
      .from(menuSections)
      .where(id ? and(eq(menuSections.slug, slug), ne(menuSections.id, id)) : eq(menuSections.slug, slug))
      .limit(1);
    if (duplicate[0]) fieldErrors.slug = "Slug nhóm món đã tồn tại.";
  }

  if (Object.keys(fieldErrors).length) {
    return { result: buildValidationResult(fieldErrors, "Vui lòng kiểm tra lại thông tin nhóm món."), id };
  }

  return {
    result: { ok: true },
    id,
    payload: {
      slug,
      titleI18n,
      descriptionI18n,
      visible: valueOf(formData, "visible") !== "hidden",
      sortOrder,
      updatedAt: new Date(),
    },
  };
}

async function validateMenuItemForm(formData: FormData): Promise<{ result: ValidationResult; payload?: MenuItemValidationPayload; id: number }> {
  const id = numberValue(formData, "id");
  const sectionId = numberValue(formData, "sectionId");
  const nameI18n = buildRequiredI18n(formData, "nameI18n", 160, "nameVi");
  const slug = (valueOf(formData, "slug") || slugifyMenuValue(nameI18n.vi)).toLowerCase();
  const noteI18n = buildRequiredI18n(formData, "noteI18n", 160, "noteVi");
  const descriptionI18n = buildRequiredI18n(formData, "descriptionI18n", 2000, "descriptionVi");
  const priceLabel = valueOf(formData, "priceLabel");
  const imagePath = trimOptionalString(valueOf(formData, "imagePath"), 500);
  const sortOrderValue = numberValue(formData, "sortOrder");
  const sortOrder = sortOrderValue >= 1 ? sortOrderValue : (sectionId ? await getNextMenuItemSortOrder(sectionId) : 1);
  const fieldErrors: Record<string, string> = {};

  if (!sectionId) fieldErrors.sectionId = "Vui lòng chọn nhóm món.";
  if (!nameI18n.vi || nameI18n.vi.length < 2) fieldErrors.nameVi = "Tên món phải có ít nhất 2 ký tự.";
  if (!priceLabel) fieldErrors.priceLabel = "Giá hiển thị là bắt buộc.";
  if (!slug) {
    fieldErrors.slug = "Slug là bắt buộc.";
  } else if (!SLUG_PATTERN.test(slug)) {
    fieldErrors.slug = "Slug chỉ được chứa chữ thường, số và dấu gạch ngang.";
  }
  if (imagePath && !IMAGE_PATH_PATTERN.test(imagePath)) {
    fieldErrors.imagePath = "Ảnh phải là đường dẫn nội bộ bắt đầu bằng / hoặc URL http/https hợp lệ.";
  }

  if (!fieldErrors.sectionId) {
    const sectionRows = await db.select({ id: menuSections.id }).from(menuSections).where(eq(menuSections.id, sectionId)).limit(1);
    if (!sectionRows[0]) fieldErrors.sectionId = "Nhóm món không tồn tại.";
  }

  if (!fieldErrors.slug) {
    const duplicate = await db
      .select({ id: menuItems.id })
      .from(menuItems)
      .where(id ? and(eq(menuItems.slug, slug), ne(menuItems.id, id)) : eq(menuItems.slug, slug))
      .limit(1);
    if (duplicate[0]) fieldErrors.slug = "Slug món đã tồn tại.";
  }

  if (Object.keys(fieldErrors).length) {
    return { result: buildValidationResult(fieldErrors, "Vui lòng kiểm tra lại thông tin món."), id };
  }

  return {
    result: { ok: true },
    id,
    payload: {
      sectionId,
      slug,
      nameI18n,
      noteI18n,
      descriptionI18n,
      priceLabel,
      imagePath,
      visible: valueOf(formData, "visible") !== "hidden",
      sortOrder,
      updatedAt: new Date(),
    },
  };
}

async function validateServiceForm(formData: FormData): Promise<{ result: ValidationResult; payload?: ServiceValidationPayload; id: number }> {
  const id = numberValue(formData, "id");
  const name = valueOf(formData, "name");
  const rawSlug = valueOf(formData, "slug");
  const slug = rawSlug.toLowerCase();
  const category = valueOf(formData, "category") || "Dịch vụ";
  const description = trimOptionalString(valueOf(formData, "description"), 2000);
  const priceLabel = valueOf(formData, "priceLabel");
  const imagePath = trimOptionalString(valueOf(formData, "imagePath"), 500);
  const rawZoneSlug = trimOptionalString(valueOf(formData, "zoneSlug"), 120);
  const zoneSlug = rawZoneSlug === "all" ? null : rawZoneSlug;
  const sortOrderRaw = valueOf(formData, "sortOrder");
  const sortOrder = Number(sortOrderRaw || "1");
  const localeKeys = ["vi", "en", "zh", "ko", "ja"] as const;
  const buildI18n = (prefix: string, maxLength: number): Record<string, string> | null => {
    const entries = localeKeys.reduce<Array<[string, string]>>((result, locale) => {
      const value = trimOptionalString(valueOf(formData, `${prefix}_${locale}`), maxLength);
      if (value) {
        result.push([locale, value]);
      }
      return result;
    }, []);
    return entries.length ? Object.fromEntries(entries) : null;
  };
  const nameI18n = buildI18n("nameI18n", 160);
  const descriptionI18n = buildI18n("descriptionI18n", 2000);
  const priceLabelI18n = buildI18n("priceLabelI18n", 120);

  const fieldErrors: Record<string, string> = {};

  if (name.length < 2) {
    fieldErrors.name = "Tên dịch vụ phải có ít nhất 2 ký tự.";
  }
  if (!slug) {
    fieldErrors.slug = "Slug là bắt buộc.";
  } else if (!SLUG_PATTERN.test(slug)) {
    fieldErrors.slug = "Slug chỉ được chứa chữ thường, số và dấu gạch ngang.";
  }
  if (!priceLabel) {
    fieldErrors.priceLabel = "Giá hiển thị là bắt buộc.";
  }
  if (!VALID_SERVICE_CATEGORIES.has(category)) {
    fieldErrors.category = "Danh mục không hợp lệ.";
  }
  if (!Number.isInteger(sortOrder) || sortOrder < 1) {
    fieldErrors.sortOrder = "Vị trí hiển thị phải là số nguyên lớn hơn hoặc bằng 1.";
  }
  if (imagePath && !IMAGE_PATH_PATTERN.test(imagePath)) {
    fieldErrors.imagePath = "Ảnh phải là đường dẫn nội bộ bắt đầu bằng / hoặc URL http/https hợp lệ.";
  }
  if (zoneSlug && !SLUG_PATTERN.test(zoneSlug)) {
    fieldErrors.zoneSlug = "Khu vực không hợp lệ.";
  }

  if (zoneSlug && !fieldErrors.zoneSlug) {
    const zoneRows = await db.select({ id: zones.id }).from(zones).where(eq(zones.slug, zoneSlug)).limit(1);
    if (!zoneRows[0]) {
      fieldErrors.zoneSlug = "Khu vực không tồn tại.";
    }
  }

  if (!fieldErrors.slug && slug) {
    const rows = await db
      .select({ id: services.id })
      .from(services)
      .where(id ? and(eq(services.slug, slug), ne(services.id, id)) : eq(services.slug, slug))
      .limit(1);
    if (rows[0]) {
      fieldErrors.slug = "Slug này đã tồn tại.";
    }
  }

  if (Object.keys(fieldErrors).length) {
    return { result: buildValidationResult(fieldErrors, "Vui lòng kiểm tra lại thông tin dịch vụ."), id };
  }

  return {
    result: { ok: true },
    id,
    payload: {
      name,
      slug,
      category,
      description,
      priceLabel,
      imagePath,
      visible: valueOf(formData, "visible") !== "hidden",
      bookingEnabled: valueOf(formData, "bookingEnabled") !== "disabled",
      zoneSlug,
      nameI18n,
      descriptionI18n,
      priceLabelI18n,
      sortOrder,
      updatedAt: new Date(),
    },
  };
}

async function validateBookingForm(formData: FormData): Promise<{ result: ValidationResult; payload?: BookingValidationPayload }> {
  const code = trimOptionalString(valueOf(formData, "code"), 80) || undefined;
  const customerName = valueOf(formData, "customerName");
  const customerPhone = valueOf(formData, "customerPhone");
  const bookingDate = valueOf(formData, "bookingDate");
  const bookingTime = valueOf(formData, "bookingTime");
  const guestCountRaw = valueOf(formData, "guestCount");
  const guestCount = Number(guestCountRaw);
  const zoneSlug = trimOptionalString(valueOf(formData, "zoneSlug"), 120);
  const tableCode = trimOptionalString(valueOf(formData, "tableCode"), 80)?.toUpperCase() || null;
  const statusValue = valueOf(formData, "status") || "pending";
  const depositSlipPath = trimOptionalString(valueOf(formData, "depositSlipPath"), 500);
  const depositReviewStatusValue = valueOf(formData, "depositReviewStatus") || (depositSlipPath ? "submitted" : "not_submitted");
  const depositReviewNote = trimOptionalString(valueOf(formData, "depositReviewNote"), 1000);
  const note = trimOptionalString(valueOf(formData, "note"), 1000);
  const fieldErrors: Record<string, string> = {};

  if (customerName.length < 2) {
    fieldErrors.customerName = "Tên khách hàng phải có ít nhất 2 ký tự.";
  }
  if (!customerPhone) {
    fieldErrors.customerPhone = "Số điện thoại là bắt buộc.";
  } else if (!PHONE_ALLOWED_PATTERN.test(customerPhone) || normalizePhone(customerPhone).length < 9 || normalizePhone(customerPhone).length > 15) {
    fieldErrors.customerPhone = "Số điện thoại không hợp lệ.";
  }
  if (!isValidDateString(bookingDate)) {
    fieldErrors.bookingDate = "Ngày đặt không hợp lệ.";
  }
  if (!isValidTimeString(bookingTime)) {
    fieldErrors.bookingTime = "Giờ đặt không hợp lệ.";
  }
  if (!Number.isInteger(guestCount) || guestCount < 1) {
    fieldErrors.guestCount = "Số lượng khách phải là số nguyên lớn hơn hoặc bằng 1.";
  }
  if (!VALID_BOOKING_STATUSES.has(statusValue)) {
    fieldErrors.status = "Trạng thái booking không hợp lệ.";
  }
  if (depositSlipPath && !IMAGE_PATH_PATTERN.test(depositSlipPath)) {
    fieldErrors.depositSlipPath = "Ảnh bill phải là đường dẫn nội bộ bắt đầu bằng / hoặc URL http/https hợp lệ.";
  }
  if (!["not_submitted", "submitted", "approved", "rejected"].includes(depositReviewStatusValue)) {
    fieldErrors.depositReviewStatus = "Trạng thái duyệt bill không hợp lệ.";
  }
  if (depositReviewStatusValue === "submitted" && !depositSlipPath) {
    fieldErrors.depositSlipPath = "Cần ảnh bill cọc trước khi gửi chờ duyệt.";
  }
  if (depositReviewStatusValue === "rejected" && !depositReviewNote) {
    fieldErrors.depositReviewNote = "Cần nhập lý do từ chối bill cọc.";
  }

  let resolvedZoneSlug: string | null = zoneSlug;
  if (resolvedZoneSlug === "all") resolvedZoneSlug = null;

  if (resolvedZoneSlug) {
    const zoneRows = await db.select({ id: zones.id }).from(zones).where(eq(zones.slug, resolvedZoneSlug)).limit(1);
    if (!zoneRows[0]) {
      fieldErrors.zoneSlug = "Khu vực không tồn tại.";
    }
  }

  if (tableCode) {
    const tableRows = await db
      .select({ id: tables.id, zoneId: tables.zoneId })
      .from(tables)
      .where(eq(tables.code, tableCode))
      .limit(1);
    const table = tableRows[0];
    if (!table) {
      fieldErrors.tableCode = "Bàn không tồn tại.";
    } else if (resolvedZoneSlug) {
      const zoneRows = await db.select({ id: zones.id }).from(zones).where(eq(zones.slug, resolvedZoneSlug)).limit(1);
      const zone = zoneRows[0];
      if (zone && table.zoneId && table.zoneId !== zone.id) {
        fieldErrors.tableCode = "Bàn không thuộc khu vực đã chọn.";
      }
    }
  }

  if (Object.keys(fieldErrors).length) {
    return { result: buildValidationResult(fieldErrors, "Vui lòng kiểm tra lại thông tin booking.") };
  }

  return {
    result: { ok: true },
    payload: {
      id: numberValue(formData, "id") || undefined,
      code,
      customerName,
      customerPhone,
      bookingDate,
      bookingTime,
      guestCount,
      zoneSlug: resolvedZoneSlug,
      tableCode,
      status: statusValue as typeof bookings.$inferInsert.status,
      depositSlipPath,
      depositReviewStatus: depositReviewStatusValue as typeof bookings.$inferInsert.depositReviewStatus,
      depositReviewedAt: depositReviewStatusValue === "approved" || depositReviewStatusValue === "rejected" ? new Date() : null,
      depositReviewNote,
      note,
    },
  };
}

const BOOKING_CONFIG_BANK_OPTIONS = [
  { code: "ICB", name: "VietinBank" },
  { code: "VCB", name: "Vietcombank" },
  { code: "BIDV", name: "BIDV" },
  { code: "VBA", name: "Agribank" },
  { code: "OCB", name: "OCB" },
  { code: "MB", name: "MBBank" },
  { code: "TCB", name: "Techcombank" },
  { code: "ACB", name: "ACB" },
  { code: "VPB", name: "VPBank" },
  { code: "TPB", name: "TPBank" },
  { code: "STB", name: "Sacombank" },
  { code: "HDB", name: "HDBank" },
  { code: "VCCB", name: "VietCapitalBank" },
  { code: "SCB", name: "SCB" },
  { code: "VIB", name: "VIB" },
  { code: "SHB", name: "SHB" },
  { code: "EIB", name: "Eximbank" },
  { code: "MSB", name: "MSB" },
  { code: "CAKE", name: "CAKE" },
  { code: "Ubank", name: "Ubank" },
  { code: "VTLMONEY", name: "ViettelMoney" },
  { code: "TIMO", name: "Timo" },
  { code: "VNPTMONEY", name: "VNPTMoney" },
  { code: "SGICB", name: "SaigonBank" },
  { code: "BAB", name: "BacABank" },
  { code: "momo", name: "MoMo" },
  { code: "PVDB", name: "PVcomBank Pay" },
  { code: "PVCB", name: "PVcomBank" },
  { code: "MBV", name: "MBV" },
  { code: "NCB", name: "NCB" },
  { code: "SHBVN", name: "ShinhanBank" },
  { code: "ABB", name: "ABBANK" },
  { code: "VAB", name: "VietABank" },
  { code: "NAB", name: "NamABank" },
  { code: "PGB", name: "PGBank" },
  { code: "VIETBANK", name: "VietBank" },
  { code: "BVB", name: "BaoVietBank" },
  { code: "SEAB", name: "SeABank" },
  { code: "COOPBANK", name: "COOPBANK" },
  { code: "LPB", name: "LPBank" },
  { code: "KLB", name: "KienLongBank" },
  { code: "KBank", name: "KBank" },
  { code: "MAFC", name: "MAFC" },
  { code: "HLBVN", name: "HongLeong" },
  { code: "KEBHANAHN", name: "KEBHANAHN" },
  { code: "KEBHANAHCM", name: "KEBHanaHCM" },
  { code: "CITIBANK", name: "Citibank" },
  { code: "CBB", name: "CBBank" },
  { code: "CIMB", name: "CIMB" },
  { code: "DBS", name: "DBSBank" },
  { code: "Vikki", name: "Vikki" },
  { code: "VBSP", name: "VBSP" },
  { code: "GPB", name: "GPBank" },
  { code: "KBHCM", name: "KookminHCM" },
  { code: "KBHN", name: "KookminHN" },
  { code: "WVN", name: "Woori" },
  { code: "VRB", name: "VRB" },
  { code: "HSBC", name: "HSBC" },
  { code: "IBK - HN", name: "IBKHN" },
  { code: "IBK - HCM", name: "IBKHCM" },
  { code: "IVB", name: "IndovinaBank" },
  { code: "UOB", name: "UnitedOverseas" },
  { code: "NHB HN", name: "Nonghyup" },
  { code: "SCVN", name: "StandardChartered" },
  { code: "PBVN", name: "PublicBank" },
] as const;

const BOOKING_CONFIG_BANK_CODE_ALIASES: Record<string, string> = {
  mbbank: "MB",
  vietcombank: "VCB",
  vietinbank: "ICB",
  bidv: "BIDV",
  agribank: "VBA",
  acb: "ACB",
  tpbank: "TPB",
  techcombank: "TCB",
  shb: "SHB",
  ocb: "OCB",
  sacombank: "STB",
  hdbank: "HDB",
  msb: "MSB",
  vib: "VIB",
  vpbank: "VPB",
  eximbank: "EIB",
  pvcombank: "PVCB",
  pvcombankpay: "PVDB",
  seabank: "SEAB",
  vietcapitalbank: "VCCB",
  vietabank: "VAB",
  vietbank: "VIETBANK",
  abbank: "ABB",
  bacabank: "BAB",
  baovietbank: "BVB",
  pgbank: "PGB",
  lpbank: "LPB",
  kienlongbank: "KLB",
  ncb: "NCB",
  namabank: "NAB",
  saigonbank: "SGICB",
  publicbank: "PBVN",
  standardchartered: "SCVN",
  shinhanbank: "SHBVN",
  hongleong: "HLBVN",
  indovinabank: "IVB",
  unitedoverseas: "UOB",
  nonghyup: "NHB HN",
  kookminhn: "KBHN",
  kookminhcm: "KBHCM",
  citibank: "CITIBANK",
  cbbank: "CBB",
  dbsbank: "DBS",
  woori: "WVN",
  gpbank: "GPB",
};

function normalizeBookingConfigBankCode(value: string) {
  const text = value.trim();
  return BOOKING_CONFIG_BANK_CODE_ALIASES[text.toLowerCase()] || text;
}

function slugifyZoneValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function validateZoneForm(formData: FormData): Promise<{ result: ValidationResult; payload?: ZoneValidationPayload; id: number }> {
  const id = numberValue(formData, "id");
  const name = valueOf(formData, "name");
  const slug = (valueOf(formData, "slug") || slugifyZoneValue(name)).toLowerCase();
  const fieldErrors: Record<string, string> = {};

  if (name.length < 2) {
    fieldErrors.name = "Tên khu vực phải có ít nhất 2 ký tự.";
  }
  if (!slug) {
    fieldErrors.slug = "Slug khu vực là bắt buộc.";
  } else if (!SLUG_PATTERN.test(slug)) {
    fieldErrors.slug = "Slug chỉ được chứa chữ thường, số và dấu gạch ngang.";
  }

  if (!fieldErrors.slug) {
    const duplicate = await db
      .select({ id: zones.id })
      .from(zones)
      .where(id ? and(eq(zones.slug, slug), ne(zones.id, id)) : eq(zones.slug, slug))
      .limit(1);
    if (duplicate[0]) {
      fieldErrors.slug = "Slug khu vực đã tồn tại.";
    }
  }

  if (Object.keys(fieldErrors).length) {
    return { result: buildValidationResult(fieldErrors, "Vui lòng kiểm tra lại thông tin khu vực."), id };
  }

  return {
    result: { ok: true },
    id,
    payload: { name, slug },
  };
}

async function validateTableForm(formData: FormData): Promise<{ result: ValidationResult; payload?: TableValidationPayload; id: number }> {
  const id = numberValue(formData, "id");
  const code = valueOf(formData, "code").toUpperCase();
  const seats = Number(valueOf(formData, "seats"));
  const statusValue = valueOf(formData, "status") || "available";
  const zoneIdValue = valueOf(formData, "zoneId");
  const zoneId = zoneIdValue ? Number(zoneIdValue) : null;
  const fieldErrors: Record<string, string> = {};

  if (!code) {
    fieldErrors.code = "Mã bàn là bắt buộc.";
  } else if (code.length > 20) {
    fieldErrors.code = "Mã bàn không được vượt quá 20 ký tự.";
  }

  if (!Number.isInteger(seats) || seats < 1) {
    fieldErrors.seats = "Sức chứa phải là số nguyên lớn hơn hoặc bằng 1.";
  }

  if (!["available", "reserved", "occupied", "cleaning"].includes(statusValue)) {
    fieldErrors.status = "Trạng thái bàn không hợp lệ.";
  }

  if (zoneIdValue && (!Number.isInteger(zoneId) || (zoneId as number) < 1)) {
    fieldErrors.zoneId = "Khu vực không hợp lệ.";
  }

  if (!fieldErrors.zoneId && zoneId) {
    const zoneRows = await db.select({ id: zones.id }).from(zones).where(eq(zones.id, zoneId)).limit(1);
    if (!zoneRows[0]) {
      fieldErrors.zoneId = "Khu vực không tồn tại.";
    }
  }

  if (!fieldErrors.code) {
    const duplicate = await db
      .select({ id: tables.id })
      .from(tables)
      .where(id ? and(eq(tables.code, code), ne(tables.id, id)) : eq(tables.code, code))
      .limit(1);
    if (duplicate[0]) {
      fieldErrors.code = "Mã bàn đã tồn tại.";
    }
  }

  if (Object.keys(fieldErrors).length) {
    return { result: buildValidationResult(fieldErrors, "Vui lòng kiểm tra lại thông tin bàn."), id };
  }

  return {
    result: { ok: true },
    id,
    payload: {
      code,
      zoneId,
      seats,
      status: statusValue as typeof tables.$inferInsert.status,
    },
  };
}

async function validateBookingConfigForm(formData: FormData): Promise<{ result: ValidationResult; payload?: BookingConfigValidationPayload }> {
  const depositAmountRaw = valueOf(formData, "depositAmount");
  const depositAmount = Number(depositAmountRaw);
  const bankCode = normalizeBookingConfigBankCode(valueOf(formData, "bankCode"));
  const accountNumber = valueOf(formData, "accountNumber");
  const phone = valueOf(formData, "phone");
  const fieldErrors: Record<string, string> = {};
  const selectedBank = BOOKING_CONFIG_BANK_OPTIONS.find((bank) => bank.code === bankCode);

  if (!Number.isInteger(depositAmount) || depositAmount < 1) {
    fieldErrors.depositAmount = "Số tiền cọc phải là số nguyên lớn hơn 0.";
  }
  if (!selectedBank) {
    fieldErrors.bankName = "Vui lòng chọn ngân hàng từ danh sách hỗ trợ VietQR.";
  }
  if (!accountNumber) {
    fieldErrors.accountNumber = "Số tài khoản là bắt buộc.";
  } else if (accountNumber.length > 50) {
    fieldErrors.accountNumber = "Số tài khoản không được vượt quá 50 ký tự.";
  }
  if (!phone) {
    fieldErrors.phone = "Số điện thoại là bắt buộc.";
  } else if (!PHONE_ALLOWED_PATTERN.test(phone) || normalizePhone(phone).length < 9 || normalizePhone(phone).length > 15) {
    fieldErrors.phone = "Số điện thoại không hợp lệ.";
  } else if (phone.length > 40) {
    fieldErrors.phone = "Số điện thoại không được vượt quá 40 ký tự.";
  }

  if (Object.keys(fieldErrors).length || !selectedBank) {
    return { result: buildValidationResult(fieldErrors, "Vui lòng kiểm tra lại cấu hình settings.") };
  }

  return {
    result: { ok: true },
    payload: {
      depositAmount,
      bankName: selectedBank.name,
      bankCode: selectedBank.code,
      accountNumber,
      phone,
      updatedAt: new Date(),
    },
  };
}

async function revalidateStaffPages() {
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  revalidatePath("/staff");
}

async function loadAssignmentRowsByStaffMember(staffMemberId: number) {
  const assignments = await db.select().from(staffAssignments).where(eq(staffAssignments.staffMemberId, staffMemberId));
  const shifts = await db.select().from(staffShifts);
  const shiftById = Object.fromEntries(shifts.map((shift) => [shift.id, shift]));

  return assignments.flatMap((assignment) => {
    const shift = shiftById[assignment.staffShiftId];
    if (!shift) return [];

    return [{
      id: assignment.id,
      shiftDate: shift.shiftDate,
      startTime: shift.startTime,
      endTime: shift.endTime,
    }];
  });
}

function hasTimeOverlap(
  existing: Array<{ id: number; shiftDate: string; startTime: string; endTime: string }>,
  nextAssignment: { id?: number; shiftDate: string; startTime: string; endTime: string },
) {
  const nextStart = `${nextAssignment.shiftDate}T${nextAssignment.startTime}`;
  const nextEnd = `${nextAssignment.shiftDate}T${nextAssignment.endTime}`;

  return existing.some((item) => {
    if (nextAssignment.id && item.id === nextAssignment.id) return false;
    if (item.shiftDate !== nextAssignment.shiftDate) return false;

    const currentStart = `${item.shiftDate}T${item.startTime}`;
    const currentEnd = `${item.shiftDate}T${item.endTime}`;

    return currentStart < nextEnd && nextStart < currentEnd;
  });
}

export async function saveBookingAction(formData: FormData): Promise<ValidationResult> {
  const { result, payload } = await validateBookingForm(formData);
  if (!result.ok || !payload) {
    return result;
  }

  await saveBooking(payload);

  revalidatePath("/dashboard");
  revalidatePath("/bookings");
  revalidatePath("/calendar");
  return { ok: true };
}

export async function updateBookingStatusAction(formData: FormData): Promise<ValidationResult> {
  const id = numberValue(formData, "id");
  const statusValue = valueOf(formData, "status");

  if (!id) {
    return { ok: false, formError: "Không tìm thấy booking cần cập nhật trạng thái." };
  }

  if (!VALID_BOOKING_STATUSES.has(statusValue)) {
    return {
      ok: false,
      fieldErrors: { status: "Trạng thái booking không hợp lệ." },
      formError: "Không thể cập nhật trạng thái booking.",
    };
  }

  const status = statusValue as NonNullable<typeof bookings.$inferInsert.status>;

  await db.update(bookings).set({
    status,
    updatedAt: new Date(),
  }).where(eq(bookings.id, id));

  await db.insert(bookingStatusHistory).values({
    bookingId: id,
    status,
    note: "Admin cập nhật trạng thái từ danh sách booking.",
  });

  revalidatePath("/dashboard");
  revalidatePath("/bookings");
  revalidatePath("/calendar");
  return { ok: true };
}

function logBookingAdmin(label: string, data: Record<string, unknown>) {
  console.log(`[booking-admin] ${label}`, data);
}

export async function reviewBookingDepositAction(formData: FormData): Promise<ValidationResult> {
  const id = numberValue(formData, "id");
  logBookingAdmin("review:start", {
    id,
    decision: valueOf(formData, "decision") || "",
  });
  if (!id) {
    return { ok: false, formError: "Không tìm thấy booking cần duyệt bill cọc." };
  }

  const decision = valueOf(formData, "decision");
  const depositReviewNote = trimOptionalString(valueOf(formData, "depositReviewNote"), 1000);
  if (decision !== "approved" && decision !== "rejected") {
    return { ok: false, formError: "Quyết định duyệt bill cọc không hợp lệ." };
  }

  const bookingRows = await db
    .select({
      id: bookings.id,
      code: bookings.code,
      status: bookings.status,
      depositSlipPath: bookings.depositSlipPath,
      zoneId: bookings.zoneId,
      tableId: bookings.tableId,
    })
    .from(bookings)
    .where(eq(bookings.id, id))
    .limit(1);
  const booking = bookingRows[0];
  if (!booking) {
    return { ok: false, formError: "Booking không tồn tại." };
  }
  if (!booking.depositSlipPath) {
    return { ok: false, formError: "Booking này chưa có bill cọc để duyệt." };
  }

  const nextStatus = decision === "approved" ? "confirmed" : booking.status;
  const reviewedAt = new Date();
  const nextCode = booking.code;

  await db
    .update(bookings)
    .set({
      status: nextStatus,
      depositReviewStatus: decision,
      depositReviewedAt: reviewedAt,
      depositReviewNote: decision === "rejected" ? depositReviewNote : null,
      updatedAt: reviewedAt,
    })
    .where(eq(bookings.id, id));

  await db.insert(bookingStatusHistory).values({
    bookingId: id,
    status: nextStatus,
    note: decision === "approved" ? "Admin đã xác nhận bill cọc." : `Admin từ chối bill cọc${depositReviewNote ? `: ${depositReviewNote}` : "."}`,
  });

  const zoneRows = booking.zoneId
    ? await db.select({ name: zones.name }).from(zones).where(eq(zones.id, booking.zoneId)).limit(1)
    : [];
  const tableRows = booking.tableId
    ? await db.select({ code: tables.code }).from(tables).where(eq(tables.id, booking.tableId)).limit(1)
    : [];

  const { broadcastRealtimeEvent, REALTIME_EVENTS } = await import("@/lib/server/realtime-events");
  logBookingAdmin("review:broadcast", {
    id,
    code: nextCode,
    previousCode: booking.code,
    decision,
    nextStatus,
  });
  broadcastRealtimeEvent(REALTIME_EVENTS.bookingUpdated, {
    id,
    code: nextCode,
    previousCode: booking.code,
    status: nextStatus,
    depositReviewStatus: decision,
    zoneName: zoneRows[0]?.name ?? null,
    tableCode: tableRows[0]?.code ?? null,
    updatedAt: reviewedAt.toISOString(),
  });

  revalidatePath("/dashboard");
  revalidatePath("/bookings");
  revalidatePath("/calendar");
  return { ok: true };
}

export async function saveServiceAction(formData: FormData): Promise<ValidationResult> {
  const { result, payload, id } = await validateServiceForm(formData);
  if (!result.ok || !payload) {
    return result;
  }

  await db.transaction(async (tx) => {
    await shiftServiceOrder(tx, payload, id || undefined);
  });

  revalidatePath("/dashboard");
  revalidatePath("/services");
  return { ok: true };
}

async function ensureBookingConfigTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS booking_configs (
      id serial PRIMARY KEY,
      deposit_amount integer NOT NULL,
      bank_name varchar(120) NOT NULL,
      bank_code varchar(40) NOT NULL DEFAULT 'mbbank',
      account_number varchar(50) NOT NULL,
      phone varchar(40) NOT NULL DEFAULT '09680881',
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    ALTER TABLE booking_configs
    ADD COLUMN IF NOT EXISTS phone varchar(40) NOT NULL DEFAULT '09680881'
  `);
}

export async function saveBookingConfigAction(formData: FormData): Promise<ValidationResult> {
  const { result, payload } = await validateBookingConfigForm(formData);
  if (!result.ok || !payload) {
    return result;
  }

  await ensureBookingConfigTable();

  const rows = await db.select({ id: bookingConfigs.id }).from(bookingConfigs).orderBy(asc(bookingConfigs.id)).limit(1);
  const existingId = rows[0]?.id;

  if (existingId) {
    await db.update(bookingConfigs).set(payload).where(eq(bookingConfigs.id, existingId));
  } else {
    await db.insert(bookingConfigs).values(payload);
  }

  revalidatePath("/settings");
  return { ok: true };
}

export async function deleteServiceAction(formData: FormData) {
  const id = numberValue(formData, "id");
  if (!id) return;

  await db.transaction(async (tx) => {
    await deleteAndCompactServiceOrder(tx, id);
  });
  revalidatePath("/dashboard");
  revalidatePath("/services");
}

function revalidateTablePages() {
  revalidatePath("/dashboard");
  revalidatePath("/tables");
  revalidatePath("/bookings");
  revalidatePath("/waiter-requests");
}

export async function saveZoneAction(formData: FormData): Promise<ValidationResult> {
  const { result, payload, id } = await validateZoneForm(formData);
  if (!result.ok || !payload) {
    return result;
  }

  if (id) {
    await db.update(zones).set(payload).where(eq(zones.id, id));
  } else {
    await db.insert(zones).values(payload);
  }

  revalidateTablePages();
  return { ok: true };
}

export async function deleteZoneAction(formData: FormData): Promise<ValidationResult> {
  const id = numberValue(formData, "id");
  if (!id) return { ok: false, formError: "Không tìm thấy khu vực cần xóa." };

  const [tableLinks, bookingLinks, waiterLinks] = await Promise.all([
    db.select({ id: tables.id }).from(tables).where(eq(tables.zoneId, id)).limit(1),
    db.select({ id: bookings.id }).from(bookings).where(eq(bookings.zoneId, id)).limit(1),
    db.select({ id: waiterRequests.id }).from(waiterRequests).where(eq(waiterRequests.zoneId, id)).limit(1),
  ]);

  if (tableLinks[0] || bookingLinks[0] || waiterLinks[0]) {
    return { ok: false, formError: "Khu vực vẫn đang liên kết với bàn, booking hoặc yêu cầu phục vụ. Hãy xử lý liên kết trước khi xóa." };
  }

  await db.delete(zones).where(eq(zones.id, id));
  revalidateTablePages();
  return { ok: true };
}

export async function saveTableAction(formData: FormData): Promise<ValidationResult> {
  const { result, payload, id } = await validateTableForm(formData);
  if (!result.ok || !payload) {
    return result;
  }

  if (id) {
    await db.update(tables).set(payload).where(eq(tables.id, id));
  } else {
    await db.insert(tables).values(payload);
  }

  revalidateTablePages();
  return { ok: true };
}

export async function updateTableStatusAction(formData: FormData): Promise<ValidationResult> {
  const id = numberValue(formData, "id");
  const status = valueOf(formData, "status");

  if (!id) return { ok: false, formError: "Không tìm thấy bàn cần cập nhật trạng thái." };
  if (!["available", "reserved", "occupied", "cleaning"].includes(status)) {
    return { ok: false, fieldErrors: { status: "Trạng thái bàn không hợp lệ." }, formError: "Không thể cập nhật trạng thái bàn." };
  }

  await db.update(tables).set({ status: status as typeof tables.$inferInsert.status }).where(eq(tables.id, id));
  revalidateTablePages();
  return { ok: true };
}

export async function deleteTableAction(formData: FormData): Promise<ValidationResult> {
  const id = numberValue(formData, "id");
  if (!id) return { ok: false, formError: "Không tìm thấy bàn cần xóa." };

  const [bookingLinks, waiterLinks] = await Promise.all([
    db.select({ id: bookings.id }).from(bookings).where(eq(bookings.tableId, id)).limit(1),
    db.select({ id: waiterRequests.id }).from(waiterRequests).where(eq(waiterRequests.tableId, id)).limit(1),
  ]);

  if (bookingLinks[0] || waiterLinks[0]) {
    return { ok: false, formError: "Bàn vẫn đang liên kết với booking hoặc yêu cầu phục vụ. Hãy xử lý liên kết trước khi xóa." };
  }

  await db.delete(tables).where(eq(tables.id, id));
  revalidateTablePages();
  return { ok: true };
}

export async function importMenuCatalogAction(): Promise<ValidationResult & { sectionCount?: number; itemCount?: number }> {
  await ensureMenuCatalogTables();
  const sourceSections = await loadMenuCatalogSource();

  await db.transaction(async (tx) => {
    for (const [sectionIndex, section] of sourceSections.entries()) {
      const existingSection = await tx.select({ id: menuSections.id }).from(menuSections).where(eq(menuSections.slug, section.id)).limit(1);
      let sectionId = existingSection[0]?.id;

      if (sectionId) {
        await tx.update(menuSections).set({
          titleI18n: section.title,
          descriptionI18n: section.description,
          visible: true,
          sortOrder: sectionIndex + 1,
          updatedAt: new Date(),
        }).where(eq(menuSections.id, sectionId));
      } else {
        const inserted = await tx.insert(menuSections).values({
          slug: section.id,
          titleI18n: section.title,
          descriptionI18n: section.description,
          visible: true,
          sortOrder: sectionIndex + 1,
          updatedAt: new Date(),
        }).returning({ id: menuSections.id });
        sectionId = inserted[0]?.id;
      }

      if (!sectionId) throw new Error(`section-import-failed:${section.id}`);

      for (const [itemIndex, item] of section.items.entries()) {
        const existingItem = await tx.select({ id: menuItems.id }).from(menuItems).where(eq(menuItems.slug, item.id)).limit(1);
        const payload = {
          sectionId,
          slug: item.id,
          nameI18n: item.name,
          noteI18n: item.note,
          descriptionI18n: item.description,
          priceLabel: item.price,
          imagePath: item.image,
          visible: true,
          sortOrder: itemIndex + 1,
          updatedAt: new Date(),
        };

        if (existingItem[0]) {
          await tx.update(menuItems).set(payload).where(eq(menuItems.id, existingItem[0].id));
        } else {
          await tx.insert(menuItems).values(payload);
        }
      }
    }
  });

  const importedSections = await getMenuSections();
  const sourceItemCount = sourceSections.reduce((total, section) => total + section.items.length, 0);
  const importedItemCount = importedSections.reduce((total, section) => total + section.items.length, 0);

  const sourceSectionIds = new Set(sourceSections.map((section) => section.id));
  const importedSectionIds = new Set(importedSections.map((section) => section.slug));
  const sourceItemIds = new Set(sourceSections.flatMap((section) => section.items.map((item) => item.id)));
  const importedItemIds = new Set(importedSections.flatMap((section) => section.items.map((item) => item.slug)));

  const missingSection = [...sourceSectionIds].find((id) => !importedSectionIds.has(id));
  const missingItem = [...sourceItemIds].find((id) => !importedItemIds.has(id));

  if (sourceSections.length !== importedSections.length || sourceItemCount !== importedItemCount || missingSection || missingItem) {
    return {
      ok: false,
      formError: "Đồng bộ menu thất bại do dữ liệu sau import chưa khớp hoàn toàn với giao diện user.",
      sectionCount: importedSections.length,
      itemCount: importedItemCount,
    };
  }

  revalidateMenuCatalogPaths();
  return { ok: true, sectionCount: importedSections.length, itemCount: importedItemCount };
}

export async function saveMenuSectionAction(formData: FormData): Promise<ValidationResult> {
  await ensureMenuCatalogTables();
  const { result, payload, id } = await validateMenuSectionForm(formData);
  if (!result.ok || !payload) return result;

  if (id) {
    await db.update(menuSections).set(payload).where(eq(menuSections.id, id));
  } else {
    await db.insert(menuSections).values(payload);
  }

  revalidateMenuCatalogPaths();
  return { ok: true };
}

export async function saveMenuItemAction(formData: FormData): Promise<ValidationResult> {
  await ensureMenuCatalogTables();
  const { result, payload, id } = await validateMenuItemForm(formData);
  if (!result.ok || !payload) return result;

  if (id) {
    await db.update(menuItems).set(payload).where(eq(menuItems.id, id));
  } else {
    await db.insert(menuItems).values(payload);
  }

  revalidateMenuCatalogPaths();
  return { ok: true };
}

export async function deleteMenuSectionAction(formData: FormData) {
  const id = numberValue(formData, "id");
  if (!id) return;
  await db.delete(menuSections).where(eq(menuSections.id, id));
  revalidateMenuCatalogPaths();
}

export async function deleteMenuItemAction(formData: FormData) {
  const id = numberValue(formData, "id");
  if (!id) return;
  await db.delete(menuItems).where(eq(menuItems.id, id));
  revalidateMenuCatalogPaths();
}

export async function reorderMenuSectionsAction(formData: FormData) {
  const id = numberValue(formData, "id");
  const targetSortOrder = numberValue(formData, "sortOrder");
  if (!id || targetSortOrder < 1) return;

  await db.transaction(async (tx) => {
    const normalizedRows = await normalizeMenuSectionSortOrder(tx);
    const current = normalizedRows.find((row) => row.id === id);
    if (!current) return;
    const max = normalizedRows.length;
    const next = clampServicePosition(targetSortOrder, 1, max);
    if (next === current.sortOrder) return;

    await tx.update(menuSections).set({ sortOrder: MENU_ORDER_PARKED_VALUE, updatedAt: new Date() }).where(eq(menuSections.id, id));
    if (next < current.sortOrder) {
      await tx.update(menuSections).set({ sortOrder: sql`${menuSections.sortOrder} + 1`, updatedAt: new Date() }).where(and(gte(menuSections.sortOrder, next), lte(menuSections.sortOrder, current.sortOrder - 1)));
    } else {
      await tx.update(menuSections).set({ sortOrder: sql`${menuSections.sortOrder} - 1`, updatedAt: new Date() }).where(and(gte(menuSections.sortOrder, current.sortOrder + 1), lte(menuSections.sortOrder, next)));
    }
    await tx.update(menuSections).set({ sortOrder: next, updatedAt: new Date() }).where(eq(menuSections.id, id));
  });

  revalidateMenuCatalogPaths();
}

export async function reorderMenuItemsAction(formData: FormData) {
  const id = numberValue(formData, "id");
  const sectionId = numberValue(formData, "sectionId");
  const targetSortOrder = numberValue(formData, "sortOrder");
  if (!id || !sectionId || targetSortOrder < 1) return;

  await db.transaction(async (tx) => {
    const normalizedRows = await normalizeMenuItemSortOrder(tx, sectionId);
    const current = normalizedRows.find((row) => row.id === id);
    if (!current) return;
    const max = normalizedRows.length;
    const next = clampServicePosition(targetSortOrder, 1, max);
    if (next === current.sortOrder) return;

    await tx.update(menuItems).set({ sortOrder: MENU_ORDER_PARKED_VALUE, updatedAt: new Date() }).where(eq(menuItems.id, id));
    if (next < current.sortOrder) {
      await tx.update(menuItems).set({ sortOrder: sql`${menuItems.sortOrder} + 1`, updatedAt: new Date() }).where(and(eq(menuItems.sectionId, sectionId), gte(menuItems.sortOrder, next), lte(menuItems.sortOrder, current.sortOrder - 1)));
    } else {
      await tx.update(menuItems).set({ sortOrder: sql`${menuItems.sortOrder} - 1`, updatedAt: new Date() }).where(and(eq(menuItems.sectionId, sectionId), gte(menuItems.sortOrder, current.sortOrder + 1), lte(menuItems.sortOrder, next)));
    }
    await tx.update(menuItems).set({ sortOrder: next, updatedAt: new Date() }).where(eq(menuItems.id, id));
  });

  revalidateMenuCatalogPaths();
}

export async function saveWaiterRequestAction(formData: FormData) {
  const id = numberValue(formData, "id");
  await saveWaiterRequest({
    id: id || undefined,
    code: valueOf(formData, "code") || undefined,
    zoneId: numberValue(formData, "zoneId") || undefined,
    zoneSlug: valueOf(formData, "zoneSlug") || null,
    tableId: numberValue(formData, "tableId") || undefined,
    tableCode: valueOf(formData, "tableCode") || null,
    need: valueOf(formData, "need"),
    note: optionalValue(formData, "note"),
    status: (valueOf(formData, "status") || undefined) as typeof waiterRequests.$inferInsert.status | undefined,
  });

  revalidatePath("/dashboard");
  revalidatePath("/waiter-requests");
}

export async function deleteBookingAction(formData: FormData) {
  const id = numberValue(formData, "id");
  logBookingAdmin("delete:start", { id });
  if (!id) return;

  const bookingRows = await db
    .select({
      id: bookings.id,
      code: bookings.code,
      customerName: bookings.customerName,
      bookingDate: bookings.bookingDate,
      bookingTime: bookings.bookingTime,
      updatedAt: bookings.updatedAt,
    })
    .from(bookings)
    .where(eq(bookings.id, id))
    .limit(1);
  const booking = bookingRows[0];
  if (!booking) return;

  await db.delete(bookings).where(eq(bookings.id, id));

  const { broadcastRealtimeEvent, REALTIME_EVENTS } = await import("@/lib/server/realtime-events");
  logBookingAdmin("delete:broadcast", {
    id: booking.id,
    code: booking.code,
    source: "admin_delete",
  });
  broadcastRealtimeEvent(REALTIME_EVENTS.bookingDeleted, {
    id: booking.id,
    code: booking.code,
    status: "deleted",
    customerName: booking.customerName,
    bookingDate: booking.bookingDate,
    bookingTime: booking.bookingTime,
    deletedAt: new Date().toISOString(),
    source: "admin_delete",
    updatedAt: booking.updatedAt.toISOString(),
  });

  revalidatePath("/dashboard");
  revalidatePath("/bookings");
  revalidatePath("/calendar");
}

export async function saveStaffMemberAction(formData: FormData) {
  const id = numberValue(formData, "id");
  const payload = {
    code: valueOf(formData, "code") || buildCode("ST"),
    fullName: valueOf(formData, "fullName"),
    phone: valueOf(formData, "phone"),
    role: (valueOf(formData, "role") || "service") as typeof staffMembers.$inferInsert.role,
    status: (valueOf(formData, "status") || "active") as typeof staffMembers.$inferInsert.status,
    preferredZoneId: await findZoneIdBySlug(valueOf(formData, "preferredZoneSlug")),
    notes: optionalValue(formData, "notes"),
    updatedAt: new Date(),
  };

  if (id) {
    await db.update(staffMembers).set(payload).where(eq(staffMembers.id, id));
  } else {
    await db.insert(staffMembers).values(payload);
  }

  await revalidateStaffPages();
}

export async function toggleStaffStatusAction(formData: FormData) {
  const id = numberValue(formData, "id");
  if (!id) return;

  const nextStatus = isTruthyValue(valueOf(formData, "active")) ? "active" : "inactive";

  await db.update(staffMembers).set({ status: nextStatus, updatedAt: new Date() }).where(eq(staffMembers.id, id));
  await revalidateStaffPages();
}

export async function saveStaffShiftAction(formData: FormData) {
  const id = numberValue(formData, "id");
  const payload = {
    shiftDate: valueOf(formData, "shiftDate"),
    startTime: valueOf(formData, "startTime"),
    endTime: valueOf(formData, "endTime"),
    label: valueOf(formData, "label") || "Ca mới",
    zoneId: await findZoneIdBySlug(valueOf(formData, "zoneSlug")),
    headcountRequired: numberValue(formData, "headcountRequired", 0) || null,
    notes: optionalValue(formData, "notes"),
    updatedAt: new Date(),
  };

  if (id) {
    await db.update(staffShifts).set(payload).where(eq(staffShifts.id, id));
  } else {
    await db.insert(staffShifts).values(payload);
  }

  await revalidateStaffPages();
}

export async function saveStaffAssignmentAction(formData: FormData) {
  const id = numberValue(formData, "id");
  const staffMemberId = numberValue(formData, "staffMemberId");
  if (!staffMemberId) return null;

  const shiftId = numberValue(formData, "staffShiftId") || await findShiftIdByLabel(valueOf(formData, "shiftDate"), valueOf(formData, "shiftLabel"));
  if (!shiftId) return null;

  const shiftRows = await db.select().from(staffShifts).where(eq(staffShifts.id, shiftId)).limit(1);
  const shift = shiftRows[0];
  if (!shift) return null;

  const overlappingAssignments = await loadAssignmentRowsByStaffMember(staffMemberId);
  if (hasTimeOverlap(overlappingAssignments, { id, shiftDate: shift.shiftDate, startTime: shift.startTime, endTime: shift.endTime })) {
    throw new Error("Nhân viên đang bị trùng ca trong cùng khung giờ.");
  }

  const payload = {
    staffMemberId,
    staffShiftId: shiftId,
    zoneId: await findZoneIdBySlug(valueOf(formData, "zoneSlug")),
    assignmentRole: optionalValue(formData, "assignmentRole") as typeof staffAssignments.$inferInsert.assignmentRole,
    status: (valueOf(formData, "status") || "assigned") as typeof staffAssignments.$inferInsert.status,
    notes: optionalValue(formData, "notes"),
    updatedAt: new Date(),
  };

  let assignmentId = id;

  if (id) {
    await db.update(staffAssignments).set(payload).where(eq(staffAssignments.id, id));
  } else {
    const inserted = await db.insert(staffAssignments).values(payload).returning({ id: staffAssignments.id });
    assignmentId = inserted[0]?.id ?? 0;
  }

  if (assignmentId) {
    await db.insert(staffAssignmentEvents).values({
      staffAssignmentId: assignmentId,
      eventType: id ? "reassigned" : "created",
      payload: { shiftId, staffMemberId },
    });
  }

  await revalidateStaffPages();
  return assignmentId || null;
}

export async function moveStaffAssignmentAction(formData: FormData) {
  const id = numberValue(formData, "id");
  if (!id) return;

  const rows = await db.select().from(staffAssignments).where(eq(staffAssignments.id, id)).limit(1);
  const assignment = rows[0];
  if (!assignment) return;

  const currentShiftRows = await db.select().from(staffShifts).where(eq(staffShifts.id, assignment.staffShiftId)).limit(1);
  const currentShift = currentShiftRows[0];
  if (!currentShift) return;

  const zoneId = await findZoneIdBySlug(valueOf(formData, "zoneSlug"));
  const requestedShiftId = numberValue(formData, "staffShiftId");
  const requestedDate = valueOf(formData, "shiftDate");
  const requestedStartTime = valueOf(formData, "startTime");
  const requestedEndTime = valueOf(formData, "endTime");

  let nextShiftId = requestedShiftId || await findShiftIdByLabel(requestedDate, valueOf(formData, "shiftLabel"));

  if (!nextShiftId) {
    const resolvedShiftId = await resolveShiftForAssignmentMove({
      currentShift,
      shiftDate: requestedDate || currentShift.shiftDate,
      startTime: requestedStartTime || currentShift.startTime,
      endTime: requestedEndTime || currentShift.endTime,
      shiftLabel: valueOf(formData, "shiftLabel") || currentShift.label,
      zoneId,
    });
    nextShiftId = resolvedShiftId ?? 0;
  }

  if (!nextShiftId) return;

  const shiftRows = await db.select().from(staffShifts).where(eq(staffShifts.id, nextShiftId)).limit(1);
  const shift = shiftRows[0];
  if (!shift) return;

  const overlappingAssignments = await loadAssignmentRowsByStaffMember(assignment.staffMemberId);
  if (hasTimeOverlap(overlappingAssignments, { id, shiftDate: shift.shiftDate, startTime: shift.startTime, endTime: shift.endTime })) {
    throw new Error("Nhân viên đang bị trùng ca trong cùng khung giờ.");
  }

  await db.update(staffAssignments).set({
    staffShiftId: nextShiftId,
    zoneId,
    updatedAt: new Date(),
  }).where(eq(staffAssignments.id, id));

  await db.insert(staffAssignmentEvents).values({
    staffAssignmentId: id,
    eventType: requestedStartTime || requestedEndTime ? "resized" : "moved",
    payload: { nextShiftId, shiftDate: shift.shiftDate, startTime: shift.startTime, endTime: shift.endTime },
  });

  await revalidateStaffPages();
}

export async function moveBookingAction(formData: FormData) {
  const id = numberValue(formData, "id");
  if (!id) return;

  const nextStatus: NonNullable<typeof bookings.$inferInsert.status> =
    (valueOf(formData, "status") || "confirmed") as NonNullable<typeof bookings.$inferInsert.status>;
  const payload = {
    bookingDate: valueOf(formData, "bookingDate"),
    bookingTime: valueOf(formData, "bookingTime"),
    zoneId: await findZoneIdBySlug(valueOf(formData, "zoneSlug")),
    tableId: await findTableIdByCode(valueOf(formData, "tableCode")),
    status: nextStatus,
    updatedAt: new Date(),
  };

  await db.update(bookings).set(payload).where(eq(bookings.id, id));
  await db.insert(bookingStatusHistory).values({
    bookingId: id,
    status: nextStatus,
    note: "Moved from calendar",
  });

  revalidatePath("/dashboard");
  revalidatePath("/bookings");
  revalidatePath("/calendar");
}

export async function deleteStaffAssignmentAction(formData: FormData) {
  const id = numberValue(formData, "id");
  if (!id) return;

  await db.delete(staffAssignments).where(eq(staffAssignments.id, id));
  await revalidateStaffPages();
}

export async function deleteStaffShiftAction(formData: FormData) {
  const id = numberValue(formData, "id");
  if (!id) return;

  await db.delete(staffShifts).where(eq(staffShifts.id, id));
  await revalidateStaffPages();
}

export async function deleteStaffMemberAction(formData: FormData) {
  const id = numberValue(formData, "id");
  if (!id) return;

  await db.delete(staffMembers).where(eq(staffMembers.id, id));
  await revalidateStaffPages();
}

export async function setStaffAssignmentStatusAction(formData: FormData) {
  const id = numberValue(formData, "id");
  if (!id) return;

  const status = (valueOf(formData, "status") || "assigned") as typeof staffAssignments.$inferInsert.status;

  await db.update(staffAssignments).set({ status, updatedAt: new Date() }).where(eq(staffAssignments.id, id));
  await db.insert(staffAssignmentEvents).values({
    staffAssignmentId: id,
    eventType: "status_changed",
    payload: { status },
  });

  await revalidateStaffPages();
}

export async function cloneStaffShiftAction(formData: FormData) {
  const id = numberValue(formData, "id");
  if (!id) return;

  const rows = await db.select().from(staffShifts).where(eq(staffShifts.id, id)).limit(1);
  const shift = rows[0];
  if (!shift) return;

  await db.insert(staffShifts).values({
    shiftDate: valueOf(formData, "shiftDate") || shift.shiftDate,
    startTime: shift.startTime,
    endTime: shift.endTime,
    label: `${shift.label} copy`,
    zoneId: shift.zoneId,
    headcountRequired: shift.headcountRequired,
    notes: shift.notes,
  });

  await revalidateStaffPages();
}

export async function saveStaffAssignmentVoidAction(formData: FormData) {
  await saveStaffAssignmentAction(formData);
}


