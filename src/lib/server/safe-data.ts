import {
  getFallbackCalendarSnapshot,
  getFallbackDashboardSnapshot,
  getFallbackStaffSnapshot,
  getFallbackZones,
} from "@/lib/server/fallback-data";
import {
  getBookings,
  getDashboardSnapshot,
  getServices,
  getStaffAssignments,
  getStaffMembers,
  getStaffShifts,
  getStaffingCalendarSnapshot,
  getTables,
  getWaiterRequests,
  getZones,
} from "@/lib/server/queries";

export async function safeDashboardSnapshot() {
  try {
    const snapshot = await getDashboardSnapshot();
    return {
      ...snapshot,
      services: await getServices(),
      timeline: snapshot.bookingList.slice(0, 3).map((booking) => ({
        time: booking.bookingTime,
        title: `${booking.customerName} - ${booking.zoneName ?? "Chưa gán khu"} / ${booking.tableCode ?? "Chưa gán bàn"}`,
        detail: `${booking.guestCount} khách · ${booking.status}`,
      })),
      usingFallback: false,
    };
  } catch {
    return {
      ...getFallbackDashboardSnapshot(),
      usingFallback: true,
    };
  }
}

export async function safeBookings() {
  try {
    return { data: await getBookings(), usingFallback: false };
  } catch {
    return { data: getFallbackDashboardSnapshot().bookingList, usingFallback: true };
  }
}

export async function safeWaiterRequests() {
  try {
    return { data: await getWaiterRequests(), usingFallback: false };
  } catch {
    return { data: getFallbackDashboardSnapshot().waiterList, usingFallback: true };
  }
}

export async function safeTables() {
  try {
    return { data: await getTables(), usingFallback: false };
  } catch {
    return { data: getFallbackDashboardSnapshot().tableList, usingFallback: true };
  }
}

export async function safeServices() {
  try {
    return { data: await getServices(), usingFallback: false };
  } catch {
    return { data: getFallbackDashboardSnapshot().services, usingFallback: true };
  }
}

export async function safeZones() {
  try {
    const data = await getZones();
    if (data.length === 0) return { data: getFallbackZones(), usingFallback: true };
    return { data, usingFallback: false };
  } catch {
    return { data: getFallbackZones(), usingFallback: true };
  }
}

export async function safeStaffMembers() {
  try {
    return { data: await getStaffMembers(), usingFallback: false };
  } catch {
    return { data: getFallbackStaffSnapshot().staffList, usingFallback: true };
  }
}

export async function safeStaffShifts() {
  try {
    return { data: await getStaffShifts(), usingFallback: false };
  } catch {
    return { data: getFallbackStaffSnapshot().shiftList, usingFallback: true };
  }
}

export async function safeStaffAssignments() {
  try {
    return { data: await getStaffAssignments(), usingFallback: false };
  } catch {
    return { data: getFallbackStaffSnapshot().assignmentList, usingFallback: true };
  }
}

export async function safeStaffWorkspace() {
  try {
    return { data: await getStaffingCalendarSnapshot(), usingFallback: false };
  } catch {
    return { data: getFallbackCalendarSnapshot(), usingFallback: true };
  }
}

export async function safeStaffPageData() {
  const [{ data: staffList, usingFallback: staffFallback }, { data: shiftList, usingFallback: shiftFallback }, { data: assignmentList, usingFallback: assignmentFallback }, { data: zoneList, usingFallback: zoneFallback }] = await Promise.all([
    safeStaffMembers(),
    safeStaffShifts(),
    safeStaffAssignments(),
    safeZones(),
  ]);

  return {
    data: {
      staffList,
      shiftList,
      assignmentList,
      zoneList,
    },
    usingFallback: staffFallback || shiftFallback || assignmentFallback || zoneFallback,
  };
}
