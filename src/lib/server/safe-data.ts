import {
  getBookingConfig,
  getBookings,
  getBookingServices,
  getDashboardSnapshot,
  getMenuSections,
  getServices,
  getShiftTemplates,
  getStaffAssignments,
  getStaffMembers,
  getStaffShifts,
  getStaffingCalendarSnapshot,
  getTables,
  getVisibleMenuSectionsForUser,
  getWaiterRequests,
  getZones,
} from "@/lib/server/queries";

const emptyDashboardSnapshot = {
  bookingList: [],
  waiterList: [],
  tableList: [],
  stats: {
    bookingsToday: 0,
    waiterOpen: 0,
    occupiedTables: 0,
    activeStaff: 0,
    assignedStaffToday: 0,
    staffingAlerts: 0,
  },
  services: [],
  staffList: [],
  shiftList: [],
  assignmentList: [],
  staffingRecommendations: [],
  assignmentConflicts: [],
  timeline: [],
};

const emptyStaffWorkspace = {
  bookingList: [],
  zoneList: [],
  timeline: [],
  staffList: [],
  shiftList: [],
  assignmentList: [],
  staffingRecommendations: [],
  assignmentConflicts: [],
};

export async function safeDashboardSnapshot() {
  try {
    const snapshot = await getDashboardSnapshot();
    return {
      ...snapshot,
      services: await getServices(),
      timeline: snapshot.bookingList.slice(0, 3).map((booking) => ({
        bookingId: booking.id,
        time: booking.bookingTime,
        title: `${booking.customerName} - ${booking.zoneName ?? "Chưa gán khu"} / ${booking.tableCode ?? "Chưa gán bàn"}`,
        detail: `${booking.guestCount} khách · ${booking.status}`,
      })),
      usingFallback: false,
    };
  } catch {
    return {
      ...emptyDashboardSnapshot,
      usingFallback: false,
    };
  }
}

export async function safeBookings() {
  try {
    return { data: await getBookings(), usingFallback: false };
  } catch {
    return { data: [], usingFallback: false };
  }
}

export async function safeWaiterRequests() {
  try {
    return { data: await getWaiterRequests(), usingFallback: false };
  } catch {
    return { data: [], usingFallback: false };
  }
}

export async function safeTables() {
  try {
    return { data: await getTables(), usingFallback: false };
  } catch {
    return { data: [], usingFallback: false };
  }
}

export async function safeServices() {
  try {
    return { data: await getServices(), usingFallback: false };
  } catch {
    return { data: [], usingFallback: false };
  }
}

export async function safeBookingServices() {
  try {
    return { data: await getBookingServices(), usingFallback: false };
  } catch {
    return { data: [], usingFallback: false };
  }
}

export async function safeBookingConfig() {
  try {
    const data = await getBookingConfig();
    if (!data) return { data: null, usingFallback: false };
    return {
      data: {
        depositAmount: data.depositAmount,
        bankName: data.bankName,
        bankCode: data.bankCode,
        accountNumber: data.accountNumber,
        phone: data.phone,
        wifiPassword: data.wifiPassword,
      },
      usingFallback: false,
    };
  } catch {
    return { data: null, usingFallback: false };
  }
}

export async function safeZones() {
  try {
    return { data: await getZones(), usingFallback: false };
  } catch {
    return { data: [], usingFallback: false };
  }
}

export async function safeMenuSections() {
  try {
    return { data: await getMenuSections(), usingFallback: false };
  } catch {
    return { data: [], usingFallback: false };
  }
}

export async function safeUserMenuSections() {
  try {
    return { data: await getVisibleMenuSectionsForUser(), usingFallback: false };
  } catch {
    return { data: [], usingFallback: false };
  }
}

export async function safeStaffMembers() {
  try {
    return { data: await getStaffMembers(), usingFallback: false };
  } catch {
    return { data: [], usingFallback: false };
  }
}

export async function safeStaffShifts() {
  try {
    return { data: await getStaffShifts(), usingFallback: false };
  } catch {
    return { data: [], usingFallback: false };
  }
}

export async function safeStaffAssignments() {
  try {
    return { data: await getStaffAssignments(), usingFallback: false };
  } catch {
    return { data: [], usingFallback: false };
  }
}

export async function safeShiftTemplates() {
  try {
    return { data: await getShiftTemplates(), usingFallback: false };
  } catch {
    return { data: [], usingFallback: false };
  }
}

export async function safeStaffWorkspace() {
  try {
    return { data: await getStaffingCalendarSnapshot(), usingFallback: false };
  } catch {
    return { data: emptyStaffWorkspace, usingFallback: false };
  }
}

export async function safeStaffPageData() {
  const [
    { data: staffList, usingFallback: staffFallback },
    { data: shiftList, usingFallback: shiftFallback },
    { data: assignmentList, usingFallback: assignmentFallback },
    { data: zoneList, usingFallback: zoneFallback },
    { data: templateList, usingFallback: templateFallback }
  ] = await Promise.all([
    safeStaffMembers(),
    safeStaffShifts(),
    safeStaffAssignments(),
    safeZones(),
    safeShiftTemplates(),
  ]);

  return {
    data: {
      staffList,
      shiftList,
      assignmentList,
      zoneList,
      templateList,
    },
    usingFallback: staffFallback || shiftFallback || assignmentFallback || zoneFallback || templateFallback,
  };
}
