"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type MutableRefObject, type ReactNode } from "react";
import FullCalendar from "@fullcalendar/react";
import type { CalendarApi } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateSelectArg, EventChangeArg, EventClickArg, EventDropArg, EventInput } from "@fullcalendar/core";
import { AlertTriangle, CalendarRange, Expand, Filter, LoaderCircle, Minimize, UsersRound } from "lucide-react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

import { SectionHeading } from "@/components/admin/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FieldLabel, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";

type BookingItem = {
  id: number;
  code: string;
  customerName: string;
  customerPhone: string;
  bookingDate: string;
  bookingTime: string;
  guestCount: number;
  status: string;
  note: string | null;
  zoneName: string | null;
  tableCode: string | null;
};

type AssignmentItem = {
  id: number;
  staffMemberId: number;
  staffShiftId: number;
  assignmentRole: string | null;
  status: string;
  notes: string | null;
  shiftDate: string;
  startTime: string;
  endTime: string;
  shiftLabel: string;
  shiftZoneName: string | null;
  staffCode: string;
  staffFullName: string;
  staffPhone: string;
  staffRole: string;
  staffStatus: string;
  staffPreferredZoneName: string | null;
};

type StaffItem = {
  id: number;
  code: string;
  fullName: string;
  phone: string;
  role: string;
  status: string;
  preferredZoneName: string | null;
};

type ShiftItem = {
  id: number;
  shiftDate: string;
  startTime: string;
  endTime: string;
  label: string;
  zoneName: string | null;
  headcountRequired: number | null;
  notes: string | null;
};

type ZoneItem = {
  id: number;
  slug: string;
  name: string;
};

type RecommendationItem = {
  shiftId: number;
  shiftLabel: string;
  shiftDate: string;
  zoneName: string;
  bookingCount: number;
  guestCount: number;
  assignedCount: number;
  headcountRequired: number | null;
  recommendedHeadcount: number;
  isShort: boolean;
};

type ConflictItem = {
  assignmentId: number;
  staffMemberId: number;
  overlapsWith: number[];
};

type CalendarSelection =
  | { type: "booking"; item: BookingItem }
  | { type: "assignment"; item: AssignmentItem }
  | null;

type StaffCalendarProps = {
  bookingList: BookingItem[];
  staffList: StaffItem[];
  assignmentList: AssignmentItem[];
  shiftList: ShiftItem[];
  zoneList: ZoneItem[];
  staffingRecommendations: RecommendationItem[];
  assignmentConflicts: ConflictItem[];
  usingFallback: boolean;
  moveBookingAction: (formData: FormData) => Promise<void>;
  moveStaffAssignmentAction: (formData: FormData) => Promise<void>;
  saveStaffAssignmentAction: (formData: FormData) => Promise<number | null>;
  setStaffAssignmentStatusAction: (formData: FormData) => Promise<void>;
};

type CalendarViewportState = {
  currentDate: Date;
  currentView: string;
};

type StaffCalendarSurfaceProps = {
  calendarRef: MutableRefObject<FullCalendar | null>;
  isPending: boolean;
  events: EventInput[];
  onDateSelect: (info: DateSelectArg) => void;
  onEventClick: (info: EventClickArg) => void;
  onEventDrop: (info: EventDropArg) => void;
  onEventResize: (info: EventChangeArg) => void;
  onToggleExpand: () => void;
  expandLabel: string;
  showExpandControl?: boolean;
  initialView: string;
  initialDate: Date;
  isExpanded?: boolean;
};

function addNinetyMinutes(date: string, time: string) {
  const start = new Date(`${date}T${time}:00`);
  return new Date(start.getTime() + 90 * 60 * 1000).toISOString();
}

function getStatusTone(status: string) {
  if (status === "pending" || status === "assigned") return "warning" as const;
  if (status === "confirmed") return "success" as const;
  if (status === "seated") return "info" as const;
  if (status === "absent" || status === "cancelled" || status === "no_show") return "danger" as const;
  return "default" as const;
}

function getRoleLabel(role: string) {
  if (role === "manager") return "Quản lý";
  if (role === "service") return "Phục vụ";
  if (role === "kitchen") return "Bếp";
  if (role === "cashier") return "Thu ngân";
  if (role === "support") return "Hỗ trợ";
  return role;
}

function getBookingStatusLabel(status: string) {
  if (status === "pending") return "Chờ xác nhận";
  if (status === "confirmed") return "Đã xác nhận";
  if (status === "seated") return "Đã check-in";
  if (status === "completed") return "Hoàn tất";
  if (status === "cancelled") return "Đã hủy";
  if (status === "no_show") return "Không đến";
  return status;
}

function getZoneFilterValue(zoneName: string | null) {
  return zoneName ?? "Toàn khu";
}

function SubmitButton({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="secondary" className="w-full" disabled={pending}>
      {pending ? "Đang lưu..." : children}
    </Button>
  );
}

function StaffCalendarSurface({
  calendarRef,
  isPending,
  events,
  onDateSelect,
  onEventClick,
  onEventDrop,
  onEventResize,
  onToggleExpand,
  expandLabel,
  showExpandControl = true,
  initialView,
  initialDate,
  isExpanded = false,
}: StaffCalendarSurfaceProps) {
  return (
    <div className={`calendar-surface ${isExpanded ? "calendar-surface--expanded " : ""}overflow-hidden rounded-[24px] border border-[color:var(--line)] bg-white/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] ${isExpanded ? "h-full p-3 md:p-4" : "p-4"}`}>
      {showExpandControl ? (
        <div className="calendar-expand-control">
          <Button
            variant={isExpanded ? "secondary" : "outline"}
            size="icon"
            onClick={onToggleExpand}
            aria-label={expandLabel}
            title={expandLabel}
          >
            {isExpanded ? <Minimize /> : <Expand />}
          </Button>
        </div>
      ) : null}
      <style>{`
        .fc {
          --fc-border-color: rgba(63,111,66,0.12);
          --fc-page-bg-color: transparent;
          --fc-neutral-bg-color: rgba(220,239,214,0.25);
          --fc-today-bg-color: rgba(205,229,195,0.45);
          --fc-button-bg-color: #3f6f42;
          --fc-button-border-color: #3f6f42;
          --fc-button-hover-bg-color: #26482b;
          --fc-button-hover-border-color: #26482b;
          --fc-button-active-bg-color: #26482b;
          --fc-button-active-border-color: #26482b;
          --fc-event-text-color: #f8fff5;
        }
        .fc .fc-toolbar {
          gap: 0.75rem;
        }
        .fc .fc-toolbar-title {
          font-family: var(--font-charm), sans-serif;
          color: var(--forest-dark);
          font-size: 1.8rem;
          font-weight: 700;
        }
        .fc .fc-col-header-cell-cushion,
        .fc .fc-daygrid-day-number,
        .fc .fc-timegrid-slot-label-cushion,
        .fc .fc-timegrid-axis-cushion {
          color: var(--text);
        }
        .fc .fc-event {
          border-radius: 14px;
          box-shadow: 0 10px 22px rgba(45,82,44,0.12);
          border: none;
          padding: 2px 4px;
        }
        .fc .booking-event {
          background: linear-gradient(135deg, #6e9565, #87ab7f);
        }
        .fc .assignment-event {
          background: linear-gradient(135deg, #2f5d62, #4a8088);
        }
        .fc .assignment-event--highlighted {
          box-shadow: 0 0 0 3px rgba(244,226,155,0.95), 0 14px 28px rgba(45,82,44,0.24);
          transform: scale(1.02);
        }
        .fc .fc-button {
          border-radius: 999px;
          box-shadow: 0 10px 24px rgba(45,82,44,0.14);
          text-transform: capitalize;
        }
        .fc .fc-button-group {
          gap: 0.35rem;
          border-radius: 999px;
          padding: 0.3rem;
          background: rgba(255,255,255,0.72);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.8);
        }
        .fc .fc-button-group > .fc-button {
          border-radius: 999px !important;
          border: none;
          background: transparent;
          color: var(--forest-dark);
          box-shadow: none;
        }
        .fc .fc-button-group > .fc-button:hover,
        .fc .fc-button-group > .fc-button:focus-visible {
          background: rgba(110,149,101,0.16);
          color: var(--forest-dark);
          box-shadow: none;
        }
        .fc .fc-button-group > .fc-button.fc-button-active {
          background: linear-gradient(135deg, #3f6f42, #5e8b56);
          border: none;
          outline: none;
          color: #f8fff5;
          box-shadow: 0 10px 18px rgba(45,82,44,0.2);
        }
        .fc .fc-button-group > .fc-button.fc-button-active:hover {
          background: linear-gradient(135deg, #365f39, #4f7848);
          color: #f8fff5;
        }
        .fc .fc-button-group > .fc-button.fc-button-active:focus,
        .fc .fc-button-group > .fc-button.fc-button-active:focus-visible {
          outline: none;
          box-shadow: 0 10px 18px rgba(45,82,44,0.2);
        }
        .fc .fc-button-primary:not(:disabled).fc-button-active:focus,
        .fc .fc-button-primary:not(:disabled).fc-button-active:focus-visible {
          outline: none;
          box-shadow: 0 10px 18px rgba(45,82,44,0.2);
        }
        .calendar-expand-control {
          position: absolute;
          top: 1rem;
          right: 1rem;
          z-index: 5;
        }
        .calendar-expand-control button {
          min-height: 2.75rem;
          min-width: 2.75rem;
          border-radius: 999px;
        }
        .calendar-expand-control .lucide {
          height: 1rem;
          width: 1rem;
        }
        .calendar-surface--expanded .calendar-expand-control {
          right: 0.75rem;
        }
        .calendar-surface--expanded .fc .fc-toolbar {
          padding-right: 3.75rem;
        }
        @media (max-width: 768px) {
          .calendar-expand-control {
            top: 0.75rem;
            right: 0.75rem;
          }
          .fc .fc-toolbar {
            padding-right: 0;
          }
        }
        @media (max-width: 640px) {
          .calendar-expand-control {
            position: static;
            margin-bottom: 0.75rem;
            display: flex;
            justify-content: flex-end;
          }
        }
        @media (max-width: 768px) {
          .fc .fc-toolbar {
            flex-direction: column;
            align-items: stretch;
          }
          .fc .fc-toolbar-chunk {
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
            gap: 0.5rem;
          }
          .fc .fc-toolbar-title {
            text-align: center;
            font-size: 1.45rem;
          }
        }
      `}</style>
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView={initialView}
        initialDate={initialDate}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        editable={!isPending}
        selectable
        eventDurationEditable
        height="auto"
        contentHeight={undefined}
        events={events}
        select={onDateSelect}
        eventClick={onEventClick}
        eventDrop={onEventDrop}
        eventResize={onEventResize}
      />
    </div>
  );
}

export function StaffCalendar({
  bookingList,
  staffList,
  assignmentList,
  shiftList,
  zoneList,
  staffingRecommendations,
  assignmentConflicts,
  usingFallback,
  moveBookingAction,
  moveStaffAssignmentAction,
  saveStaffAssignmentAction,
  setStaffAssignmentStatusAction,
}: StaffCalendarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [zoneFilter, setZoneFilter] = useState("all");
  const [bookingStatusFilter, setBookingStatusFilter] = useState("all");
  const [staffRoleFilter, setStaffRoleFilter] = useState("all");
  const [quickAssignmentRole, setQuickAssignmentRole] = useState("all");
  const [quickAssignmentZone, setQuickAssignmentZone] = useState("all");
  const [quickAssignmentStaffId, setQuickAssignmentStaffId] = useState<string>("");
  const [quickAssignmentRoleValue, setQuickAssignmentRoleValue] = useState<string>("service");
  const [quickAssignmentRoleTouched, setQuickAssignmentRoleTouched] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CalendarSelection>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [draftAssignment, setDraftAssignment] = useState<{ shiftDate: string; startTime: string; endTime: string } | null>(null);
  const [highlightedAssignmentId, setHighlightedAssignmentId] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const calendarRef = useRef<FullCalendar | null>(null);
  const pendingCreatedAssignmentIdRef = useRef<number | null>(null);
  const previousAssignmentIdsRef = useRef<string>(assignmentList.map((assignment) => assignment.id).join(","));
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const calendarApiRef = useRef<CalendarApi | null>(null);
  const calendarViewportStateRef = useRef<CalendarViewportState | null>(null);
  const [calendarViewportState, setCalendarViewportState] = useState<CalendarViewportState>({
    currentDate: new Date(),
    currentView: "timeGridWeek",
  });
  const surfaceKey = isExpanded ? "expanded" : "default";
  const calendarContainerClassName = isExpanded ? "min-h-[72vh]" : "";
  const calendarSummary = isExpanded
    ? "Chế độ mở rộng giúp kéo thả chính xác hơn trên khung giờ dày."
    : "Mở rộng lịch để có thêm không gian kéo thả nhân sự.";
  const expandButtonLabel = isExpanded ? "Thu gọn lịch" : "Mở rộng lịch";
  const filteredBookings = useMemo(
    () =>
      bookingList.filter((booking) => {
        if (zoneFilter !== "all" && getZoneFilterValue(booking.zoneName) !== zoneFilter) return false;
        if (bookingStatusFilter !== "all" && booking.status !== bookingStatusFilter) return false;
        return true;
      }),
    [bookingList, bookingStatusFilter, zoneFilter],
  );

  const filteredAssignments = useMemo(
    () =>
      assignmentList.filter((assignment) => {
        if (zoneFilter !== "all" && getZoneFilterValue(assignment.shiftZoneName) !== zoneFilter) return false;
        if (staffRoleFilter !== "all" && (assignment.assignmentRole ?? assignment.staffRole) !== staffRoleFilter) return false;
        return true;
      }),
    [assignmentList, staffRoleFilter, zoneFilter],
  );

  const filteredZoneOptions = useMemo(() => {
    const usedZoneNames = new Set<string>();

    for (const booking of bookingList) {
      usedZoneNames.add(getZoneFilterValue(booking.zoneName));
    }

    for (const assignment of assignmentList) {
      usedZoneNames.add(getZoneFilterValue(assignment.shiftZoneName));
    }

    return [
      ...zoneList.filter((zone) => usedZoneNames.has(zone.name)),
      ...zoneList.filter((zone) => !usedZoneNames.has(zone.name)),
    ];
  }, [assignmentList, bookingList, zoneList]);

  const hasActiveFilters = zoneFilter !== "all" || bookingStatusFilter !== "all" || staffRoleFilter !== "all";

  const events = useMemo<EventInput[]>(() => {
    const bookingEvents = filteredBookings.map((booking) => ({
      id: `booking-${booking.id}`,
      title: `${booking.customerName} · ${booking.tableCode ?? "Chưa gán bàn"}`,
      start: `${booking.bookingDate}T${booking.bookingTime}:00`,
      end: addNinetyMinutes(booking.bookingDate, booking.bookingTime),
      classNames: ["booking-event"],
      extendedProps: {
        entityType: "booking",
        item: booking,
      },
    }));

    const assignmentEvents = filteredAssignments.map((assignment) => ({
      id: `assignment-${assignment.id}`,
      title: `${assignment.staffFullName} · ${assignment.assignmentRole ?? assignment.staffRole}`,
      start: `${assignment.shiftDate}T${assignment.startTime}:00`,
      end: `${assignment.shiftDate}T${assignment.endTime}:00`,
      classNames: ["assignment-event", highlightedAssignmentId === assignment.id ? "assignment-event--highlighted" : ""],
      extendedProps: {
        entityType: "assignment",
        item: assignment,
      },
    }));

    return [...bookingEvents, ...assignmentEvents];
  }, [filteredAssignments, filteredBookings, highlightedAssignmentId]);

  const quickCreateStaffList = useMemo(
    () =>
      staffList.filter((staff) => {
        if (staff.status !== "active") return false;
        if (quickAssignmentRole !== "all" && staff.role !== quickAssignmentRole) return false;
        if (quickAssignmentZone !== "all" && (staff.preferredZoneName ?? "") !== quickAssignmentZone) return false;
        return true;
      }),
    [quickAssignmentRole, quickAssignmentZone, staffList],
  );

  useEffect(() => {
    const assignmentIds = assignmentList.map((assignment) => assignment.id).join(",");
    if (assignmentIds === previousAssignmentIdsRef.current) return;

    previousAssignmentIdsRef.current = assignmentIds;

    if (!pendingCreatedAssignmentIdRef.current) return;

    const createdAssignment = assignmentList.find((assignment) => assignment.id === pendingCreatedAssignmentIdRef.current);
    if (!createdAssignment) return;

    const matchesCurrentZone =
      zoneFilter === "all" ||
      zoneFilter === "Toàn khu" ||
      (createdAssignment.shiftZoneName ?? "Toàn khu") === zoneFilter;

    if (matchesCurrentZone) {
      setSelectedItem({ type: "assignment", item: createdAssignment });
      setDraftAssignment(null);
      setHighlightedAssignmentId(createdAssignment.id);

      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }

      highlightTimeoutRef.current = setTimeout(() => {
        setHighlightedAssignmentId(null);
      }, 4000);

      const calendarApi = calendarApiRef.current ?? calendarRef.current?.getApi() ?? null;
      calendarApiRef.current = calendarApi;
      if (calendarApi) {
        calendarApi.gotoDate(`${createdAssignment.shiftDate}T${createdAssignment.startTime}:00`);
        calendarApi.scrollToTime(createdAssignment.startTime);
      }
    }

    pendingCreatedAssignmentIdRef.current = null;
  }, [assignmentList, zoneFilter]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && draftAssignment) {
        event.preventDefault();
        setDraftAssignment(null);
        setErrorMessage(null);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [draftAssignment]);

  function resetCalendarFilters() {
    setZoneFilter("all");
    setBookingStatusFilter("all");
    setStaffRoleFilter("all");
    setSelectedItem(null);
    setDraftAssignment(null);
    setErrorMessage(null);
  }

  function clearFilterDependentState() {
    setSelectedItem(null);
    setDraftAssignment(null);
    setErrorMessage(null);
  }

  function handleZoneFilterChange(nextValue: string) {
    clearFilterDependentState();
    setZoneFilter(nextValue);
  }

  function handleBookingStatusFilterChange(nextValue: string) {
    clearFilterDependentState();
    setBookingStatusFilter(nextValue);
  }

  function handleStaffRoleFilterChange(nextValue: string) {
    clearFilterDependentState();
    setStaffRoleFilter(nextValue);
  }

  function getFilterSummary() {
    const summaryParts: string[] = [];

    if (zoneFilter !== "all") summaryParts.push(`Khu: ${zoneFilter}`);
    if (bookingStatusFilter !== "all") summaryParts.push(`Booking: ${getBookingStatusLabel(bookingStatusFilter)}`);
    if (staffRoleFilter !== "all") summaryParts.push(`Nhân sự: ${getRoleLabel(staffRoleFilter)}`);

    return summaryParts.join(" · ");
  }

  const filterSummary = getFilterSummary();

  const visibleSelectedItem = selectedItem?.type === "booking"
    ? filteredBookings.find((booking) => booking.id === selectedItem.item.id)
    : selectedItem?.type === "assignment"
      ? filteredAssignments.find((assignment) => assignment.id === selectedItem.item.id)
      : null;

  const selectedBookingItem: BookingItem | null = selectedItem?.type === "booking"
    ? filteredBookings.find((booking) => booking.id === selectedItem.item.id) ?? null
    : null;
  const selectedAssignmentItem: AssignmentItem | null = selectedItem?.type === "assignment"
    ? filteredAssignments.find((assignment) => assignment.id === selectedItem.item.id) ?? null
    : null;

  const visibleEventCount = filteredBookings.length + filteredAssignments.length;

  const filteredRecommendations = staffingRecommendations.filter((item) => zoneFilter === "all" || getZoneFilterValue(item.zoneName) === zoneFilter);

  const topRecommendation = filteredRecommendations.find((item) => item.isShort) ?? filteredRecommendations[0] ?? null;

  const visibleConflicts = assignmentConflicts.filter((conflict) => filteredAssignments.some((assignment) => assignment.id === conflict.assignmentId));

  const visibleShiftList = shiftList.filter((shift) => zoneFilter === "all" || getZoneFilterValue(shift.zoneName) === zoneFilter);

  const shiftListForForms = visibleShiftList.length > 0 ? visibleShiftList : shiftList;

  const zoneListForQuickFilter = filteredZoneOptions;

  const zoneListForSelect = [...filteredZoneOptions];

  if (!zoneListForSelect.some((zone) => zone.name === "Toàn khu")) {
    zoneListForSelect.push({ id: -1, slug: "all-zones", name: "Toàn khu" });
  }

  const selectedQuickStaff = quickCreateStaffList.find((staff) => String(staff.id) === quickAssignmentStaffId) ?? null;

  useEffect(() => () => {
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    if (!selectedQuickStaff) {
      if (!quickAssignmentRoleTouched) {
        setTimeout(() => setQuickAssignmentRoleValue("service"), 0);
      }
      return;
    }

    if (!quickAssignmentRoleTouched || quickAssignmentRoleValue === "" || quickAssignmentRoleValue === "service") {
      setTimeout(() => setQuickAssignmentRoleValue(selectedQuickStaff.role), 0);
    }
  }, [quickAssignmentRoleTouched, quickAssignmentRoleValue, selectedQuickStaff]);

  const contextualShiftList = useMemo(() => {
    if (!draftAssignment) return shiftList;

    const sameDayShifts = shiftList.filter((shift) => shift.shiftDate === draftAssignment.shiftDate);
    return sameDayShifts.length > 0 ? sameDayShifts : shiftList;
  }, [draftAssignment, shiftList]);

  const selectedQuickShift = draftAssignment
    ? null
    : contextualShiftList.find((shift) => String(shift.id) === String(contextualShiftList[0]?.id ?? "")) ?? null;

  const selectedQuickZone = zoneFilter === "all" || zoneFilter === "Toàn khu"
    ? null
    : zoneList.find((zone) => zone.name === zoneFilter) ?? null;

  const preferredQuickStaff = useMemo(() => {
    if (quickCreateStaffList.length === 0) return null;
    if (!selectedQuickZone) return quickCreateStaffList[0] ?? null;

    return quickCreateStaffList.find((staff) => staff.preferredZoneName === selectedQuickZone.name) ?? quickCreateStaffList[0] ?? null;
  }, [quickCreateStaffList, selectedQuickZone]);

  useEffect(() => {
    if (quickCreateStaffList.length === 0) {
      setTimeout(() => setQuickAssignmentStaffId(""), 0);
      return;
    }

    const hasSelectedStaff = quickCreateStaffList.some((staff) => String(staff.id) === quickAssignmentStaffId);
    if (!hasSelectedStaff && preferredQuickStaff) {
      setTimeout(() => setQuickAssignmentStaffId(String(preferredQuickStaff.id)), 0);
    }
  }, [preferredQuickStaff, quickAssignmentStaffId, quickCreateStaffList]);

  const quickCreateSummary = draftAssignment
    ? `Tạo ca nhanh · ${draftAssignment.shiftDate} · ${draftAssignment.startTime}-${draftAssignment.endTime}${selectedQuickZone ? ` · ${selectedQuickZone.name}` : ""}`
    : selectedQuickShift
      ? `${selectedQuickShift.shiftDate} · ${selectedQuickShift.label} · ${selectedQuickShift.startTime}-${selectedQuickShift.endTime}${selectedQuickZone ? ` · ${selectedQuickZone.name}` : ""}`
      : "Chưa có ca khả dụng";

  const quickCreateZoneDescription = selectedQuickZone
    ? `Assignment mới sẽ mặc định gắn vào khu ${selectedQuickZone.name} theo bộ lọc hiện tại và ưu tiên chọn nhân viên có khu ưu tiên khớp.`
    : "Assignment mới sẽ để Toàn khu nếu bạn chưa lọc theo khu cụ thể.";

  const quickCreateShiftDescription = draftAssignment
    ? `Danh sách ca sẽ ưu tiên cùng ngày ${draftAssignment.shiftDate} để giữ đúng ngữ cảnh slot bạn vừa chọn.`
    : "Danh sách ca đang hiển thị theo toàn bộ lịch ca hiện có.";

  const quickCreateFocusDescription = selectedQuickZone
    ? `Auto-focus sau khi tạo chỉ chạy nếu assignment mới vẫn nằm trong khu ${selectedQuickZone.name} mà bạn đang xem.`
    : "Auto-focus sau khi tạo sẽ chạy bình thường trên lịch hiện tại.";

  function captureCalendarViewport() {
    const calendarApi = calendarRef.current?.getApi() ?? calendarApiRef.current;
    if (!calendarApi) return;

    const nextViewportState = {
      currentDate: calendarApi.getDate(),
      currentView: calendarApi.view.type,
    };

    calendarApiRef.current = calendarApi;
    calendarViewportStateRef.current = nextViewportState;
    setCalendarViewportState(nextViewportState);
  }

  function toggleExpandedCalendar() {
    captureCalendarViewport();
    setIsExpanded((current) => !current);
  }

  function handleExpandedModalClose() {
    if (draftAssignment) {
      setDraftAssignment(null);
      setErrorMessage(null);
      return;
    }

    if (!isExpanded) return;
    toggleExpandedCalendar();
  }

  function handleEventClick(info: EventClickArg) {
    const entityType = info.event.extendedProps.entityType as "booking" | "assignment";
    const item = info.event.extendedProps.item as BookingItem | AssignmentItem;
    setDraftAssignment(null);
    setSelectedItem(entityType === "booking" ? { type: "booking", item: item as BookingItem } : { type: "assignment", item: item as AssignmentItem });
  }

  function handleDateSelect(info: DateSelectArg) {
    setSelectedItem(null);
    setErrorMessage(null);
    setDraftAssignment({
      shiftDate: info.start.toISOString().slice(0, 10),
      startTime: info.start.toTimeString().slice(0, 5),
      endTime: info.end.toTimeString().slice(0, 5),
    });
  }

  function renderCalendarSurface() {
    return (
      <StaffCalendarSurface
        key={surfaceKey}
        calendarRef={calendarRef}
        isPending={isPending}
        events={events}
        onDateSelect={handleDateSelect}
        onEventClick={handleEventClick}
        onEventDrop={handleEventDrop}
        onEventResize={handleEventResize}
        onToggleExpand={toggleExpandedCalendar}
        expandLabel={expandButtonLabel}
        showExpandControl={!isExpanded}
        initialView={calendarViewportState.currentView}
        initialDate={calendarViewportState.currentDate}
        isExpanded={isExpanded}
      />
    );
  }

  const topBar = (
    <div className="mb-4">
      <SectionHeading title="Lịch điều phối" description="Booking và phân ca nhân viên dùng chung một mặt lịch để điều phối theo ngày, tuần và giờ cao điểm." />
      <p className="mt-2 overflow-hidden text-sm whitespace-nowrap text-[var(--muted)] text-ellipsis">{calendarSummary}</p>
    </div>
  );

  async function submitCalendarMove(entityType: "booking" | "assignment", item: BookingItem | AssignmentItem, nextStart: Date, nextEnd?: Date) {
    setErrorMessage(null);
    try {
      const formData = new FormData();
      const nextDate = nextStart.toISOString().slice(0, 10);
      const nextTime = nextStart.toTimeString().slice(0, 5);

      if (entityType === "booking") {
        const booking = item as BookingItem;
        formData.set("id", String(booking.id));
        formData.set("bookingDate", nextDate);
        formData.set("bookingTime", nextTime);
        formData.set("status", booking.status);
        if (booking.zoneName) {
          const zone = zoneList.find((entry) => entry.name === booking.zoneName);
          if (zone) formData.set("zoneSlug", zone.slug);
        }
        if (booking.tableCode) formData.set("tableCode", booking.tableCode);
        await moveBookingAction(formData);
        setSelectedItem({
          type: "booking",
          item: {
            ...booking,
            bookingDate: nextDate,
            bookingTime: nextTime,
          },
        });
      } else {
        const assignment = item as AssignmentItem;
        formData.set("id", String(assignment.id));
        formData.set("shiftDate", nextDate);
        formData.set("startTime", nextTime);
        formData.set("endTime", (nextEnd ?? nextStart).toTimeString().slice(0, 5));
        formData.set("shiftLabel", assignment.shiftLabel);
        if (assignment.shiftZoneName) {
          const zone = zoneList.find((entry) => entry.name === assignment.shiftZoneName);
          if (zone) formData.set("zoneSlug", zone.slug);
        }
        await moveStaffAssignmentAction(formData);
        setSelectedItem({
          type: "assignment",
          item: {
            ...assignment,
            shiftDate: nextDate,
            startTime: nextTime,
            endTime: (nextEnd ?? nextStart).toTimeString().slice(0, 5),
          },
        });
      }

      router.refresh();
    } catch (error) {
      throw error instanceof Error ? error : new Error("Không thể cập nhật lịch lúc này.");
    }
  }

  function handleEventDrop(info: EventDropArg) {
    const entityType = info.event.extendedProps.entityType as "booking" | "assignment";
    const item = info.event.extendedProps.item as BookingItem | AssignmentItem;
    const eventStart = info.event.start;
    const eventEnd = info.event.end ?? undefined;
    if (!eventStart) {
      info.revert();
      return;
    }

    startTransition(async () => {
      try {
        await submitCalendarMove(entityType, item, eventStart, eventEnd);
      } catch (error) {
        info.revert();
        setErrorMessage(error instanceof Error ? error.message : "Không thể cập nhật lịch lúc này.");
      }
    });
  }

  function handleEventResize(info: EventChangeArg) {
    const entityType = info.event.extendedProps.entityType as "booking" | "assignment";
    if (entityType !== "assignment") {
      info.revert();
      return;
    }

    const item = info.event.extendedProps.item as AssignmentItem;
    const eventStart = info.event.start;
    const eventEnd = info.event.end;
    if (!eventStart || !eventEnd) {
      info.revert();
      return;
    }

    startTransition(async () => {
      try {
        await submitCalendarMove("assignment", item, eventStart, eventEnd);
      } catch (error) {
        info.revert();
        setErrorMessage(error instanceof Error ? error.message : "Không thể resize ca lúc này.");
      }
    });
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_360px]">
      <Card>
        <CardContent>
          {topBar}
          <div className="mb-4 grid gap-3 md:grid-cols-4">
            <div>
              <FieldLabel>Khu vực</FieldLabel>
              <Select value={zoneFilter} onChange={(event) => handleZoneFilterChange(event.target.value)}>
                <option value="all">Tất cả khu vực</option>
                {zoneListForSelect.map((zone) => (
                  <option key={zone.id} value={zone.name}>
                    {zone.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <FieldLabel>Trạng thái booking</FieldLabel>
              <Select value={bookingStatusFilter} onChange={(event) => handleBookingStatusFilterChange(event.target.value)}>
                <option value="all">Tất cả</option>
                <option value="pending">Chờ xác nhận</option>
                <option value="confirmed">Đã xác nhận</option>
                <option value="seated">Đã check-in</option>
                <option value="completed">Hoàn tất</option>
                <option value="cancelled">Đã hủy</option>
                <option value="no_show">Không đến</option>
              </Select>
            </div>
            <div>
              <FieldLabel>Vai trò nhân sự</FieldLabel>
              <Select value={staffRoleFilter} onChange={(event) => handleStaffRoleFilterChange(event.target.value)}>
                <option value="all">Tất cả vai trò</option>
                <option value="manager">Quản lý</option>
                <option value="service">Phục vụ</option>
                <option value="kitchen">Bếp</option>
                <option value="cashier">Thu ngân</option>
                <option value="support">Hỗ trợ</option>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="secondary" className="w-full" onClick={resetCalendarFilters}>
                <Filter className="h-4 w-4" />
                {hasActiveFilters ? "Xóa bộ lọc" : "Làm mới panel"}
              </Button>
            </div>
          </div>
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
            <span>{visibleEventCount} mục đang hiển thị</span>
            {filterSummary ? <span>• {filterSummary}</span> : null}
          </div>

          {usingFallback ? (
            <div className="mb-4 rounded-[18px] border border-[color:var(--line)] bg-[rgba(244,226,155,0.24)] px-4 py-3 text-sm text-[var(--forest-dark)]">
              Dữ liệu đang ở chế độ fallback, lịch vẫn xem được nhưng cần kiểm tra kết nối DB trước khi điều phối thực tế.
            </div>
          ) : null}
          {errorMessage ? (
            <div className="mb-4 rounded-[18px] border border-[rgba(181,74,54,0.2)] bg-[rgba(181,74,54,0.08)] px-4 py-3 text-sm text-[#8c3b27]">
              {errorMessage}
            </div>
          ) : null}
          <div className={calendarContainerClassName}>{isExpanded ? null : renderCalendarSurface()}</div>
        </CardContent>
      </Card>
      <Modal
        isOpen={isExpanded}
        onClose={handleExpandedModalClose}
        title="Lịch điều phối mở rộng"
        className="max-w-[min(96vw,1600px)] h-[92vh]"
      >
        <div>{isExpanded ? renderCalendarSurface() : null}</div>
      </Modal>

      <Card className="h-fit xl:sticky xl:top-6">
        <CardContent>
          <SectionHeading title="Điều phối nhân sự" description="Theo dõi booking peak, xung đột ca và chi tiết phần tử đang chọn ngay trên lịch." />
          <div className="space-y-4 text-sm">
            <div className="rounded-[18px] bg-white/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold text-[var(--forest-dark)]">
                  {topRecommendation ? `${topRecommendation.zoneName} · ${topRecommendation.shiftDate}` : hasActiveFilters ? "Không có khuyến nghị khớp bộ lọc" : "Chưa có khuyến nghị"}
                </div>
                {topRecommendation ? (
                  <Badge tone={topRecommendation.isShort ? "warning" : "success"}>
                    {topRecommendation.isShort ? "Thiếu người" : "Ổn định"}
                  </Badge>
                ) : null}
              </div>
              <p className="mt-2 leading-6 text-[var(--muted)]">
                {topRecommendation
                  ? `${topRecommendation.shiftLabel}: ${topRecommendation.assignedCount}/${topRecommendation.headcountRequired ?? topRecommendation.recommendedHeadcount} người, ${topRecommendation.guestCount} khách dự kiến.`
                  : "Chưa có dữ liệu khuyến nghị cho ca làm hiện tại."}
              </p>
            </div>

            {visibleConflicts.length > 0 ? (
              <div className="rounded-[18px] border border-[rgba(181,74,54,0.16)] bg-[rgba(181,74,54,0.08)] p-4 text-[#8c3b27]">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="h-4 w-4" />
                  Xung đột phân ca
                </div>
                <div className="mt-2 space-y-2">
                  {visibleConflicts.slice(0, 3).map((conflict) => {
                    const assignment = filteredAssignments.find((item) => item.id === conflict.assignmentId);
                    return (
                      <div key={conflict.assignmentId}>
                        {(assignment?.staffFullName ?? `Nhân viên #${conflict.staffMemberId}`)} · trùng với assignment {conflict.overlapsWith.join(", ")}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {selectedItem && !visibleSelectedItem ? (
              <div className="rounded-[18px] border border-dashed border-[color:var(--line)] bg-white/40 p-4 text-[var(--muted)]">
                Phần tử đang chọn không còn khớp bộ lọc hiện tại. Đổi bộ lọc hoặc chọn mục khác trên lịch.
              </div>
            ) : null}

            {selectedBookingItem ? (
              <div className="rounded-[18px] border border-[color:var(--line)] bg-white/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold text-[var(--forest-dark)]">{selectedBookingItem.customerName}</div>
                  <Badge tone={getStatusTone(selectedBookingItem.status)}>{selectedBookingItem.status}</Badge>
                </div>
                <div className="mt-2 space-y-1 text-[var(--muted)]">
                  <div>{selectedBookingItem.bookingDate} · {selectedBookingItem.bookingTime}</div>
                  <div>{selectedBookingItem.zoneName ?? "Chưa gán khu"} / {selectedBookingItem.tableCode ?? "Chưa gán bàn"}</div>
                  <div>{selectedBookingItem.guestCount} khách · {selectedBookingItem.customerPhone}</div>
                </div>
                {selectedBookingItem.note ? <p className="mt-3 leading-6 text-[var(--muted)]">{selectedBookingItem.note}</p> : null}
              </div>
            ) : null}

            {selectedAssignmentItem ? (
              <div className="rounded-[18px] border border-[color:var(--line)] bg-white/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold text-[var(--forest-dark)]">{selectedAssignmentItem.staffFullName}</div>
                  <Badge tone={getStatusTone(selectedAssignmentItem.status)}>{selectedAssignmentItem.status}</Badge>
                </div>
                <div className="mt-2 space-y-1 text-[var(--muted)]">
                  <div>{selectedAssignmentItem.shiftDate} · {selectedAssignmentItem.startTime}–{selectedAssignmentItem.endTime}</div>
                  <div>{selectedAssignmentItem.shiftLabel} · {selectedAssignmentItem.shiftZoneName ?? "Toàn khu"}</div>
                  <div>{selectedAssignmentItem.assignmentRole ?? selectedAssignmentItem.staffRole} · {selectedAssignmentItem.staffPhone}</div>
                </div>
                {selectedAssignmentItem.notes ? <p className="mt-3 leading-6 text-[var(--muted)]">{selectedAssignmentItem.notes}</p> : null}

                <form
                  action={async (formData) => {
                    setErrorMessage(null);
                    try {
                      await moveStaffAssignmentAction(formData);
                      router.refresh();
                    } catch (error) {
                      setErrorMessage(error instanceof Error ? error.message : "Không thể chuyển ca lúc này.");
                    }
                  }}
                  className="mt-4 space-y-3 rounded-[18px] border border-[color:var(--line)] bg-[rgba(248,255,245,0.76)] p-4"
                >
                  <input type="hidden" name="id" value={selectedAssignmentItem.id} />
                  <div>
                    <FieldLabel>Chuyển sang ca</FieldLabel>
                    <Select name="staffShiftId" defaultValue={String(selectedAssignmentItem.staffShiftId)}>
                      {shiftListForForms.map((shift) => (
                        <option key={shift.id} value={shift.id}>
                          {shift.shiftDate} · {shift.label} · {shift.startTime}-{shift.endTime}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <FieldLabel>Trạng thái assignment</FieldLabel>
                    <Select name="status" defaultValue={selectedAssignmentItem.status}>
                      <option value="assigned">Assigned</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="absent">Absent</option>
                    </Select>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <SubmitButton>Chuyển ca</SubmitButton>
                    <Button
                      type="submit"
                      className="w-full"
                      formAction={async (formData) => {
                        setErrorMessage(null);
                        try {
                          formData.delete("staffShiftId");
                          await setStaffAssignmentStatusAction(formData);
                          router.refresh();
                        } catch (error) {
                          setErrorMessage(error instanceof Error ? error.message : "Không thể cập nhật trạng thái lúc này.");
                        }
                      }}
                    >
                      Cập nhật trạng thái
                    </Button>
                  </div>
                </form>
              </div>
            ) : null}

            {!visibleSelectedItem ? (
              <div className="space-y-4">
                <div className="rounded-[18px] border border-dashed border-[color:var(--line)] bg-white/40 p-4 text-[var(--muted)]">
                  Chọn booking hoặc assignment để xem chi tiết, hoặc kéo chọn ô trống trên lịch để tự điền sẵn ngày giờ tạo assignment mới.
                </div>

                <form
                  action={async (formData) => {
                    setErrorMessage(null);
                    try {
                      const assignmentId = await saveStaffAssignmentAction(formData);
                      pendingCreatedAssignmentIdRef.current = assignmentId;
                      router.refresh();
                    } catch (error) {
                      pendingCreatedAssignmentIdRef.current = null;
                      setErrorMessage(error instanceof Error ? error.message : "Không thể tạo assignment lúc này.");
                    }
                  }}
                  className="rounded-[18px] border border-[color:var(--line)] bg-[rgba(248,255,245,0.76)] p-4"
                >
                  <div className="font-semibold text-[var(--forest-dark)]">Tạo assignment mới</div>
                  <div className="mt-3 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <FieldLabel>Lọc vai trò</FieldLabel>
                        <Select value={quickAssignmentRole} onChange={(event) => {
                          setQuickAssignmentRole(event.target.value);
                          setQuickAssignmentRoleTouched(false);
                        }}>
                          <option value="all">Tất cả vai trò</option>
                          <option value="manager">Quản lý</option>
                          <option value="service">Phục vụ</option>
                          <option value="kitchen">Bếp</option>
                          <option value="cashier">Thu ngân</option>
                          <option value="support">Hỗ trợ</option>
                        </Select>
                      </div>
                      <div>
                        <FieldLabel>Lọc khu ưu tiên</FieldLabel>
                        <Select value={quickAssignmentZone} onChange={(event) => {
                          setQuickAssignmentZone(event.target.value);
                          setQuickAssignmentRoleTouched(false);
                        }}>
                          <option value="all">Tất cả khu</option>
                          {zoneListForQuickFilter.map((zone) => (
                            <option key={zone.id} value={zone.name}>
                              {zone.name}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </div>
                    <div>
                      <FieldLabel>Nhân viên</FieldLabel>
                      <Select
                        name="staffMemberId"
                        value={quickAssignmentStaffId}
                        onChange={(event) => setQuickAssignmentStaffId(event.target.value)}
                        disabled={quickCreateStaffList.length === 0}
                      >
                        {quickCreateStaffList.map((staff) => (
                          <option key={staff.id} value={staff.id}>
                            {staff.fullName} · {staff.role}{staff.preferredZoneName ? ` · ${staff.preferredZoneName}` : ""}
                          </option>
                        ))}
                      </Select>
                      {selectedQuickStaff ? (
                        <div className="mt-2 text-xs text-[var(--muted)]">
                          Đang chọn: {selectedQuickStaff.fullName} · {selectedQuickStaff.phone}
                        </div>
                      ) : null}
                      {quickCreateStaffList.length === 0 ? (
                        <div className="mt-2 text-xs text-[#8c3b27]">Không có nhân viên active phù hợp với bộ lọc hiện tại.</div>
                      ) : null}
                    </div>
                    {selectedQuickZone ? <input type="hidden" name="zoneSlug" value={selectedQuickZone.slug} /> : null}
                    {draftAssignment ? (
                      <>
                        <input type="hidden" name="shiftDate" value={draftAssignment.shiftDate} />
                        <input type="hidden" name="startTime" value={draftAssignment.startTime} />
                        <input type="hidden" name="endTime" value={draftAssignment.endTime} />
                        <input type="hidden" name="shiftLabel" value={`Ca nhanh ${draftAssignment.startTime}-${draftAssignment.endTime}`} />
                        <div className="flex items-center justify-between gap-3 rounded-[14px] border border-dashed border-[color:var(--line)] bg-white/70 px-3 py-2 text-xs text-[var(--muted)]">
                          <span>Đang giữ slot {draftAssignment.shiftDate} · {draftAssignment.startTime}-{draftAssignment.endTime}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-auto px-2 py-1 text-xs"
                            onClick={() => {
                              setDraftAssignment(null);
                              setErrorMessage(null);
                            }}
                          >
                            Xóa slot chọn
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div>
                        <FieldLabel>Ca làm</FieldLabel>
                        <Select name="staffShiftId" defaultValue={contextualShiftList[0] ? String(contextualShiftList[0].id) : ""}>
                          {contextualShiftList.map((shift) => (
                            <option key={shift.id} value={shift.id}>
                              {shift.shiftDate} · {shift.label} · {shift.startTime}-{shift.endTime}
                            </option>
                          ))}
                        </Select>
                        <div className="mt-2 text-xs text-[var(--muted)]">{quickCreateShiftDescription}</div>
                      </div>
                    )}

                    {draftAssignment ? (
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          className="px-3"
                          onClick={() => {
                            setDraftAssignment(null);
                            setErrorMessage(null);
                          }}
                        >
                          Thoát tạo nhanh
                        </Button>
                      </div>
                    ) : null}
                    <div className="rounded-[14px] bg-white/70 p-3 text-[var(--muted)]">
                      <div>{quickCreateSummary}</div>
                      <div className="mt-1 text-xs">{quickCreateZoneDescription}</div>
                      <div className="mt-1 text-xs">{quickCreateFocusDescription}</div>
                    </div>
                    <div>
                      <FieldLabel>Vai trò assignment</FieldLabel>
                      <Select
                        name="assignmentRole"
                        value={quickAssignmentRoleValue}
                        onChange={(event) => {
                          setQuickAssignmentRoleTouched(true);
                          setQuickAssignmentRoleValue(event.target.value);
                        }}
                      >
                        <option value="service">Phục vụ</option>
                        <option value="manager">Quản lý</option>
                        <option value="kitchen">Bếp</option>
                        <option value="cashier">Thu ngân</option>
                        <option value="support">Hỗ trợ</option>
                      </Select>
                      <div className="mt-2 text-xs text-[var(--muted)]">
                        {selectedQuickStaff
                          ? `Mặc định theo vai trò chính của ${selectedQuickStaff.fullName}, bạn vẫn có thể đổi tay trước khi lưu.`
                          : "Chưa có nhân viên phù hợp để gợi ý vai trò mặc định."}
                      </div>
                    </div>
                    <div>
                      <FieldLabel>Trạng thái</FieldLabel>
                      <Select name="status" defaultValue="assigned">
                        <option value="assigned">Assigned</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="absent">Absent</option>
                      </Select>
                    </div>
                    {errorMessage ? (
                      <div className="flex items-start gap-2 rounded-[14px] border border-[rgba(181,74,54,0.2)] bg-[rgba(181,74,54,0.08)] px-3 py-2.5 text-xs text-[#8c3b27]">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>{errorMessage}</span>
                      </div>
                    ) : null}
                    <SubmitButton>Tạo assignment</SubmitButton>
                  </div>
                </form>
              </div>
            ) : null}

            <div className="rounded-[18px] border border-[color:var(--line)] bg-white/60 p-4">
              <div className="flex items-center gap-2 font-semibold text-[var(--forest-dark)]">
                <UsersRound className="h-4 w-4" />
                Tổng quan ca làm
              </div>
              <div className="mt-3 space-y-2 text-[var(--muted)]">
                {shiftListForForms.slice(0, 4).map((shift) => {
                  const assignedCount = assignmentList.filter((assignment) => assignment.staffShiftId === shift.id && assignment.status !== "absent").length;
                  return (
                    <div key={shift.id} className="flex items-center justify-between gap-3">
                      <div>
                        <div>{shift.label}</div>
                        <div className="text-xs">{shift.shiftDate} · {shift.zoneName ?? "Toàn khu"}</div>
                      </div>
                      <Badge tone={assignedCount < (shift.headcountRequired ?? 0) ? "warning" : "success"}>
                        {assignedCount}/{shift.headcountRequired ?? assignedCount}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>

            {isPending ? (
              <div className="flex items-center gap-2 text-[var(--muted)]">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Đang cập nhật lịch điều phối...
              </div>
            ) : null}

            <div className="rounded-[18px] border border-[color:var(--line)] bg-white/60 p-4 text-[var(--muted)]">
              <div className="flex items-center gap-2 font-semibold text-[var(--forest-dark)]">
                <CalendarRange className="h-4 w-4" />
                Gợi ý thao tác
              </div>
              <p className="mt-2 leading-6">
                Kéo booking để đổi giờ phục vụ, kéo assignment để chuyển ngày cho cùng ca. Nếu cần đổi sang ca khác, dùng màn Nhân viên để tạo assignment đúng khung giờ trước.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
