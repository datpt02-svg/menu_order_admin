import { bookingRows, serviceItems, summaryCards, tableStatus, upcomingTimeline, waiterRequests } from "@/data/mock-data";

const fallbackZones = [
  { id: 1, slug: "bbq-deck-a", name: "BBQ Deck A" },
  { id: 2, slug: "bbq-deck-b", name: "BBQ Deck B" },
  { id: 3, slug: "cafe-garden", name: "Cafe Garden" },
  { id: 4, slug: "vip-room", name: "Phòng VIP" },
];

const fallbackStaffMembers = [
  {
    code: "ST-001",
    fullName: "Phạm Thu Trang",
    phone: "0909001001",
    role: "manager" as const,
    status: "active" as const,
    preferredZoneName: "BBQ Deck A",
    notes: "Điều phối ca tối và booking đông khách.",
  },
  {
    code: "ST-002",
    fullName: "Ngô Minh Quân",
    phone: "0909001002",
    role: "service" as const,
    status: "active" as const,
    preferredZoneName: "BBQ Deck A",
    notes: "Phụ trách bàn nhóm đông.",
  },
  {
    code: "ST-003",
    fullName: "Trần Mỹ Linh",
    phone: "0909001003",
    role: "service" as const,
    status: "active" as const,
    preferredZoneName: "Cafe Garden",
    notes: "Theo dõi khu cafe.",
  },
  {
    code: "ST-004",
    fullName: "Lý Hoàng Phúc",
    phone: "0909001004",
    role: "kitchen" as const,
    status: "active" as const,
    preferredZoneName: null,
    notes: "Line bếp giờ cao điểm.",
  },
  {
    code: "ST-005",
    fullName: "Bùi Thanh Hà",
    phone: "0909001005",
    role: "cashier" as const,
    status: "active" as const,
    preferredZoneName: null,
    notes: "Hỗ trợ thanh toán cuối tuần.",
  },
  {
    code: "ST-006",
    fullName: "Đỗ Gia Hân",
    phone: "0909001006",
    role: "support" as const,
    status: "inactive" as const,
    preferredZoneName: "BBQ Deck B",
    notes: "Tạm nghỉ tuần này.",
  },
] as const;

const fallbackStaffShifts = [
  {
    shiftDate: "2026-04-22",
    startTime: "17:00",
    endTime: "21:00",
    label: "Ca tối BBQ Deck A",
    zoneName: "BBQ Deck A",
    headcountRequired: 2,
    notes: "Ưu tiên sinh nhật và nhóm đông.",
  },
  {
    shiftDate: "2026-04-22",
    startTime: "17:30",
    endTime: "21:30",
    label: "Ca tối Cafe Garden",
    zoneName: "Cafe Garden",
    headcountRequired: 1,
    notes: "Theo dõi khách lẻ và cặp đôi.",
  },
  {
    shiftDate: "2026-04-22",
    startTime: "18:00",
    endTime: "22:00",
    label: "Line bếp peak tối",
    zoneName: null,
    headcountRequired: 1,
    notes: "Chuẩn bị combo nướng.",
  },
] as const;

const fallbackStaffAssignments = [
  {
    shiftLabel: "Ca tối BBQ Deck A",
    shiftDate: "2026-04-22",
    startTime: "17:00",
    endTime: "21:00",
    shiftZoneName: "BBQ Deck A",
    staffCode: "ST-001",
    staffFullName: "Phạm Thu Trang",
    staffRole: "manager" as const,
    staffStatus: "active" as const,
    status: "confirmed" as const,
    assignmentRole: "manager" as const,
    notes: "Giữ vai trò điều phối khu nướng.",
  },
  {
    shiftLabel: "Ca tối BBQ Deck A",
    shiftDate: "2026-04-22",
    startTime: "17:00",
    endTime: "21:00",
    shiftZoneName: "BBQ Deck A",
    staffCode: "ST-002",
    staffFullName: "Ngô Minh Quân",
    staffRole: "service" as const,
    staffStatus: "active" as const,
    status: "assigned" as const,
    assignmentRole: "service" as const,
    notes: "Phụ trách bàn 4-6 khách.",
  },
  {
    shiftLabel: "Ca tối Cafe Garden",
    shiftDate: "2026-04-22",
    startTime: "17:30",
    endTime: "21:30",
    shiftZoneName: "Cafe Garden",
    staffCode: "ST-003",
    staffFullName: "Trần Mỹ Linh",
    staffRole: "service" as const,
    staffStatus: "active" as const,
    status: "confirmed" as const,
    assignmentRole: "service" as const,
    notes: "Ưu tiên bàn cặp đôi.",
  },
] as const;

function compareBookingDateDesc(
  left: { bookingDate: string; bookingTime: string },
  right: { bookingDate: string; bookingTime: string },
) {
  return `${right.bookingDate}T${right.bookingTime}`.localeCompare(`${left.bookingDate}T${left.bookingTime}`);
}

function buildFallbackBookingList() {
  return bookingRows
    .map((booking, index) => ({
      id: index + 1,
      code: booking.id,
      customerName: booking.guest,
      customerPhone: booking.phone,
      bookingDate: booking.date,
      bookingTime: booking.time,
      guestCount: booking.guests,
      zoneId: null,
      tableId: null,
      status: booking.status === "pending" ? "pending" : booking.status === "seated" ? "seated" : "confirmed",
      note: booking.note,
      createdAt: new Date(),
      updatedAt: new Date(),
      zoneName: booking.zone,
      tableCode: booking.table,
    }))
    .sort(compareBookingDateDesc);
}

function buildFallbackWaiterList() {
  return waiterRequests.map((request, index) => ({
    id: index + 1,
    code: request.id,
    tableId: null,
    zoneId: null,
    need: request.need,
    note: request.note,
    status: request.status,
    createdAt: new Date(),
    updatedAt: new Date(),
    zoneName: request.zone,
    tableCode: request.table,
  }));
}

function buildFallbackTableList() {
  return tableStatus.map((table, index) => ({
    id: index + 1,
    code: table.id,
    zoneId: null,
    seats: table.seats,
    status: table.status,
    createdAt: new Date(),
    zoneName: table.zone,
  }));
}

function buildFallbackServices() {
  return serviceItems.map((item, index) => ({
    id: index + 1,
    name: item.name,
    slug: item.id.toLowerCase(),
    category: item.category,
    description: null,
    priceLabel: item.price,
    imagePath: item.image,
    visible: item.visible,
    bookingEnabled: item.visible,
    zoneSlug: item.category === "Cafe" ? "cafe-garden" : item.category === "BBQ" ? "bbq-deck-a" : null,
    nameI18n: null,
    descriptionI18n: null,
    priceLabelI18n: null,
    sortOrder: index + 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
}

function buildFallbackTimeline(bookingList: ReturnType<typeof buildFallbackBookingList>) {
  const sortedTimeline = bookingList.slice(0, 3).map((booking) => ({
    bookingId: booking.id,
    time: booking.bookingTime,
    title: `${booking.customerName} - ${booking.zoneName ?? "Chưa gán khu"} / ${booking.tableCode ?? "Chưa gán bàn"}`,
    detail: `${booking.guestCount} khách · ${booking.status}`,
  }));

  return sortedTimeline.length > 0 ? sortedTimeline : upcomingTimeline;
}

function getFallbackStaffMembers() {
  return fallbackStaffMembers.map((staff, index) => ({
    id: index + 1,
    code: staff.code,
    fullName: staff.fullName,
    phone: staff.phone,
    role: staff.role,
    status: staff.status,
    preferredZoneId: null,
    preferredZoneName: staff.preferredZoneName,
    notes: staff.notes,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
}

function getFallbackStaffShifts() {
  return fallbackStaffShifts.map((shift, index) => ({
    id: index + 1,
    shiftDate: shift.shiftDate,
    startTime: shift.startTime,
    endTime: shift.endTime,
    label: shift.label,
    zoneId: null,
    zoneName: shift.zoneName,
    headcountRequired: shift.headcountRequired,
    notes: shift.notes,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
}

function getFallbackStaffAssignments() {
  return fallbackStaffAssignments.map((assignment, index) => ({
    id: index + 1,
    staffMemberId: index + 1,
    staffShiftId: index < 2 ? 1 : 2,
    zoneId: null,
    assignmentRole: assignment.assignmentRole,
    status: assignment.status,
    notes: assignment.notes,
    createdAt: new Date(),
    updatedAt: new Date(),
    shiftDate: assignment.shiftDate,
    startTime: assignment.startTime,
    endTime: assignment.endTime,
    shiftLabel: assignment.shiftLabel,
    shiftZoneId: null,
    shiftZoneName: assignment.shiftZoneName,
    staffCode: assignment.staffCode,
    staffFullName: assignment.staffFullName,
    staffPhone: fallbackStaffMembers.find((staff) => staff.code === assignment.staffCode)?.phone ?? "",
    staffRole: assignment.staffRole,
    staffStatus: assignment.staffStatus,
    staffPreferredZoneId: null,
    staffPreferredZoneName: fallbackStaffMembers.find((staff) => staff.code === assignment.staffCode)?.preferredZoneName ?? null,
  }));
}

export function getFallbackZones() {
  return [...fallbackZones];
}

export function getFallbackStaffSnapshot() {
  const staffList = getFallbackStaffMembers();
  const shiftList = getFallbackStaffShifts();
  const assignmentList = getFallbackStaffAssignments();

  return {
    staffList,
    shiftList,
    assignmentList,
    staffingRecommendations: shiftList.map((shift) => ({
      shiftId: shift.id,
      shiftLabel: shift.label,
      shiftDate: shift.shiftDate,
      zoneName: shift.zoneName ?? "Toàn khu",
      bookingCount: shift.zoneName === "BBQ Deck A" ? 2 : 1,
      guestCount: shift.zoneName === "BBQ Deck A" ? 10 : 4,
      assignedCount: assignmentList.filter((assignment) => assignment.staffShiftId === shift.id).length,
      headcountRequired: shift.headcountRequired,
      recommendedHeadcount: shift.zoneName === "BBQ Deck A" ? 2 : 1,
      isShort: false,
    })),
    assignmentConflicts: [],
  };
}

export function getFallbackCalendarSnapshot() {
  const dashboardSnapshot = getFallbackDashboardSnapshot();
  const staffSnapshot = getFallbackStaffSnapshot();

  return {
    bookingList: dashboardSnapshot.bookingList,
    zoneList: getFallbackZones(),
    timeline: dashboardSnapshot.timeline,
    ...staffSnapshot,
  };
}

export function getFallbackDashboardSnapshot() {
  const staffSnapshot = getFallbackStaffSnapshot();
  const bookingList = buildFallbackBookingList();
  const waiterList = buildFallbackWaiterList();
  const tableList = buildFallbackTableList();

  return {
    bookingList,
    waiterList,
    tableList,
    stats: {
      bookingsToday: Number(summaryCards[0]?.value ?? bookingList.length),
      waiterOpen: waiterList.filter((request) => request.status !== "done").length,
      occupiedTables: tableStatus.filter((table) => table.status === "occupied").length,
      activeStaff: staffSnapshot.staffList.filter((staff) => staff.status === "active").length,
      assignedStaffToday: staffSnapshot.assignmentList.length,
      staffingAlerts: 0,
    },
    services: buildFallbackServices(),
    staffList: staffSnapshot.staffList,
    shiftList: staffSnapshot.shiftList,
    assignmentList: staffSnapshot.assignmentList,
    staffingRecommendations: staffSnapshot.staffingRecommendations,
    assignmentConflicts: staffSnapshot.assignmentConflicts,
    timeline: buildFallbackTimeline(bookingList),
  };
}
