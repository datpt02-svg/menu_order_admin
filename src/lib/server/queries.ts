import { and, asc, desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import {
  bookings,
  services,
  staffAssignments,
  staffMembers,
  staffShifts,
  tables,
  waiterRequests,
  zones,
} from "@/db/schema";
import type {
  BookingRow,
  ServiceRow,
  StaffAssignmentRow,
  StaffMemberRow,
  StaffShiftRow,
  TableRow,
  WaiterRow,
  ZoneRow,
} from "@/lib/server/serializers";

function compareDateTime(date: string, time: string) {
  return `${date}T${time}`;
}

function buildTimeline(bookingList: BookingRow[]) {
  return bookingList.slice(0, 5).map((booking) => ({
    time: booking.bookingTime,
    title: `${booking.customerName} - ${booking.zoneName ?? "Chưa gán khu"} / ${booking.tableCode ?? "Chưa gán bàn"}`,
    detail: `${booking.guestCount} khách · ${booking.status}`,
  }));
}

function getTodayString() {
  return new Date().toISOString().slice(0, 10);
}

function isAssignmentOverlapping(first: StaffAssignmentRow, second: StaffAssignmentRow) {
  if (first.staffMemberId !== second.staffMemberId) return false;
  if (first.id === second.id) return false;
  if (first.shiftDate !== second.shiftDate) return false;

  const firstStart = compareDateTime(first.shiftDate, first.startTime);
  const firstEnd = compareDateTime(first.shiftDate, first.endTime);
  const secondStart = compareDateTime(second.shiftDate, second.startTime);
  const secondEnd = compareDateTime(second.shiftDate, second.endTime);

  return firstStart < secondEnd && secondStart < firstEnd;
}

function getBookingDemand(bookingList: BookingRow[], shift: StaffShiftRow) {
  return bookingList.filter((booking) => {
    if (booking.bookingDate !== shift.shiftDate) return false;

    const bookingTime = compareDateTime(booking.bookingDate, booking.bookingTime);
    const shiftStart = compareDateTime(shift.shiftDate, shift.startTime);
    const shiftEnd = compareDateTime(shift.shiftDate, shift.endTime);
    const sameZone = !shift.zoneId || booking.zoneId === shift.zoneId;

    return bookingTime >= shiftStart && bookingTime <= shiftEnd && sameZone;
  });
}

function buildStaffingRecommendations(bookingList: BookingRow[], shiftList: StaffShiftRow[], assignmentList: StaffAssignmentRow[]) {
  return shiftList.map((shift) => {
    const assignments = assignmentList.filter((assignment) => assignment.staffShiftId === shift.id && assignment.status !== "absent");
    const demandBookings = getBookingDemand(bookingList, shift);
    const guestCount = demandBookings.reduce((total, booking) => total + booking.guestCount, 0);
    const recommendedHeadcount = Math.max(1, Math.ceil(guestCount / 12));
    const requiredHeadcount = shift.headcountRequired ?? 0;

    return {
      shiftId: shift.id,
      shiftLabel: shift.label,
      shiftDate: shift.shiftDate,
      zoneName: shift.zoneName ?? "Toàn khu",
      bookingCount: demandBookings.length,
      guestCount,
      assignedCount: assignments.length,
      headcountRequired: shift.headcountRequired,
      recommendedHeadcount,
      isShort: (requiredHeadcount > 0 && assignments.length < requiredHeadcount) || assignments.length < recommendedHeadcount,
    };
  });
}

function findAssignmentConflicts(assignmentList: StaffAssignmentRow[]) {
  return assignmentList.flatMap((assignment) => {
    const overlapsWith = assignmentList
      .filter((candidate) => isAssignmentOverlapping(assignment, candidate))
      .map((candidate) => candidate.id);

    return overlapsWith.length > 0
      ? [{ assignmentId: assignment.id, staffMemberId: assignment.staffMemberId, overlapsWith }]
      : [];
  });
}

export async function getZones(): Promise<ZoneRow[]> {
  return db.select().from(zones).orderBy(zones.name);
}

export async function getBookings(): Promise<BookingRow[]> {
  const rows = await db
    .select({
      id: bookings.id,
      code: bookings.code,
      customerName: bookings.customerName,
      customerPhone: bookings.customerPhone,
      bookingDate: bookings.bookingDate,
      bookingTime: bookings.bookingTime,
      guestCount: bookings.guestCount,
      zoneId: bookings.zoneId,
      tableId: bookings.tableId,
      status: bookings.status,
      depositSlipPath: bookings.depositSlipPath,
      depositReviewStatus: bookings.depositReviewStatus,
      depositReviewedAt: bookings.depositReviewedAt,
      depositReviewNote: bookings.depositReviewNote,
      note: bookings.note,
      createdAt: bookings.createdAt,
      updatedAt: bookings.updatedAt,
      zoneName: zones.name,
      tableCode: tables.code,
      depositSlipUrl: bookings.depositSlipPath,
    })
    .from(bookings)
    .leftJoin(zones, eq(bookings.zoneId, zones.id))
    .leftJoin(tables, eq(bookings.tableId, tables.id))
    .orderBy(desc(bookings.bookingDate), desc(bookings.bookingTime));

  return rows satisfies BookingRow[];
}

export async function getWaiterRequests(): Promise<WaiterRow[]> {
  const rows = await db
    .select({
      id: waiterRequests.id,
      code: waiterRequests.code,
      tableId: waiterRequests.tableId,
      zoneId: waiterRequests.zoneId,
      need: waiterRequests.need,
      note: waiterRequests.note,
      status: waiterRequests.status,
      createdAt: waiterRequests.createdAt,
      updatedAt: waiterRequests.updatedAt,
      zoneName: zones.name,
      tableCode: tables.code,
    })
    .from(waiterRequests)
    .leftJoin(zones, eq(waiterRequests.zoneId, zones.id))
    .leftJoin(tables, eq(waiterRequests.tableId, tables.id))
    .orderBy(desc(waiterRequests.createdAt));

  return rows satisfies WaiterRow[];
}

export async function getTables(): Promise<TableRow[]> {
  const rows = await db
    .select({
      id: tables.id,
      code: tables.code,
      zoneId: tables.zoneId,
      seats: tables.seats,
      status: tables.status,
      createdAt: tables.createdAt,
      zoneName: zones.name,
    })
    .from(tables)
    .leftJoin(zones, eq(tables.zoneId, zones.id))
    .orderBy(tables.code);

  return rows satisfies TableRow[];
}

export async function getServices(): Promise<ServiceRow[]> {
  return db.select().from(services).orderBy(asc(services.sortOrder), asc(services.name), asc(services.id));
}

export async function getBookingServices(): Promise<ServiceRow[]> {
  return db
    .select()
    .from(services)
    .where(and(eq(services.visible, true), eq(services.bookingEnabled, true)))
    .orderBy(asc(services.sortOrder), asc(services.name), asc(services.id));
}

export async function getStaffMembers(): Promise<StaffMemberRow[]> {
  const rows = await db
    .select({
      id: staffMembers.id,
      code: staffMembers.code,
      fullName: staffMembers.fullName,
      phone: staffMembers.phone,
      role: staffMembers.role,
      status: staffMembers.status,
      preferredZoneId: staffMembers.preferredZoneId,
      notes: staffMembers.notes,
      createdAt: staffMembers.createdAt,
      updatedAt: staffMembers.updatedAt,
      preferredZoneName: zones.name,
    })
    .from(staffMembers)
    .leftJoin(zones, eq(staffMembers.preferredZoneId, zones.id))
    .orderBy(staffMembers.status, staffMembers.fullName);

  return rows satisfies StaffMemberRow[];
}

export async function getStaffShifts(): Promise<StaffShiftRow[]> {
  const rows = await db
    .select({
      id: staffShifts.id,
      shiftDate: staffShifts.shiftDate,
      startTime: staffShifts.startTime,
      endTime: staffShifts.endTime,
      label: staffShifts.label,
      zoneId: staffShifts.zoneId,
      headcountRequired: staffShifts.headcountRequired,
      notes: staffShifts.notes,
      createdAt: staffShifts.createdAt,
      updatedAt: staffShifts.updatedAt,
      zoneName: zones.name,
    })
    .from(staffShifts)
    .leftJoin(zones, eq(staffShifts.zoneId, zones.id))
    .orderBy(desc(staffShifts.shiftDate), staffShifts.startTime, staffShifts.label);

  return rows satisfies StaffShiftRow[];
}

export async function getStaffAssignments(): Promise<StaffAssignmentRow[]> {
  const [assignmentRows, staffList, shiftList] = await Promise.all([
    db.select().from(staffAssignments).orderBy(desc(staffAssignments.createdAt)),
    getStaffMembers(),
    getStaffShifts(),
  ]);

  const staffById = Object.fromEntries(staffList.map((staff) => [staff.id, staff]));
  const shiftById = Object.fromEntries(shiftList.map((shift) => [shift.id, shift]));

  return assignmentRows.flatMap((assignment) => {
    const staff = staffById[assignment.staffMemberId];
    const shift = shiftById[assignment.staffShiftId];

    if (!staff || !shift) return [];

    return [{
      id: assignment.id,
      staffMemberId: assignment.staffMemberId,
      staffShiftId: assignment.staffShiftId,
      zoneId: assignment.zoneId,
      assignmentRole: assignment.assignmentRole,
      status: assignment.status,
      notes: assignment.notes,
      createdAt: assignment.createdAt,
      updatedAt: assignment.updatedAt,
      shiftDate: shift.shiftDate,
      startTime: shift.startTime,
      endTime: shift.endTime,
      shiftLabel: shift.label,
      shiftZoneId: shift.zoneId,
      shiftZoneName: shift.zoneName ?? null,
      staffCode: staff.code,
      staffFullName: staff.fullName,
      staffPhone: staff.phone,
      staffRole: staff.role,
      staffStatus: staff.status,
      staffPreferredZoneId: staff.preferredZoneId,
      staffPreferredZoneName: staff.preferredZoneName ?? null,
    } satisfies StaffAssignmentRow];
  });
}

export async function getDashboardSnapshot() {
  const [bookingList, waiterList, tableList, staffList, shiftList, assignmentList] = await Promise.all([
    getBookings(),
    getWaiterRequests(),
    getTables(),
    getStaffMembers(),
    getStaffShifts(),
    getStaffAssignments(),
  ]);

  const today = getTodayString();
  const staffingRecommendations = buildStaffingRecommendations(bookingList, shiftList, assignmentList);

  return {
    bookingList,
    waiterList,
    tableList,
    staffList,
    assignmentList,
    staffingRecommendations,
    stats: {
      bookingsToday: bookingList.filter((booking) => booking.bookingDate === today).length,
      waiterOpen: waiterList.filter((item) => item.status !== "done").length,
      occupiedTables: tableList.filter((table) => table.status === "occupied").length,
      activeStaff: staffList.filter((staff) => staff.status === "active").length,
      assignedStaffToday: assignmentList.filter((assignment) => assignment.shiftDate === today && assignment.status !== "absent").length,
      staffingAlerts: staffingRecommendations.filter((item) => item.isShort).length,
    },
  };
}

export async function getStaffingCalendarSnapshot() {
  const [bookingList, staffList, shiftList, assignmentList, zoneList] = await Promise.all([
    getBookings(),
    getStaffMembers(),
    getStaffShifts(),
    getStaffAssignments(),
    getZones(),
  ]);

  const staffingRecommendations = buildStaffingRecommendations(bookingList, shiftList, assignmentList);

  return {
    bookingList,
    staffList,
    shiftList,
    assignmentList,
    zoneList,
    staffingRecommendations,
    assignmentConflicts: findAssignmentConflicts(assignmentList),
    timeline: buildTimeline(bookingList),
  };
}
