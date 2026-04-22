"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import {
  bookingStatusHistory,
  bookings,
  services,
  staffAssignmentEvents,
  staffAssignments,
  staffMembers,
  staffShifts,
  tables,
  zones,
} from "@/db/schema";

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


