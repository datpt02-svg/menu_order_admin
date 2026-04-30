import type { BookingRow, ZoneRow } from "@/lib/server/serializers";
import { formatDate, getTodayDateString } from "@/lib/utils";

export type BookingFilterInput = {
  keyword?: string | null;
  date?: string | null;
  status?: string | null;
  zone?: string | null;
};

type BookingFilterable = Pick<BookingRow, "code" | "customerName" | "customerPhone" | "bookingDate" | "zoneName"> & {
  status: string;
};
type BookingAttentionSortable = Pick<BookingRow, "bookingDate" | "bookingTime"> & {
  depositReviewStatus?: BookingRow["depositReviewStatus"];
  depositReviewedAt?: Date | string | null;
};

type BookingSortable = Pick<BookingRow, "code" | "customerName" | "guestCount" | "bookingDate" | "bookingTime" | "zoneName" | "tableCode"> & {
  status: string;
  depositReviewStatus?: BookingRow["depositReviewStatus"];
  depositReviewedAt?: Date | string | null;
};

export type BookingSortKey = "attention" | "code" | "customerName" | "guestCount" | "bookingDateTime" | "zoneTable" | "status" | "depositReviewStatus";
export type BookingSortDirection = "asc" | "desc";

export type BookingSortState = {
  key: BookingSortKey;
  direction: BookingSortDirection;
};

export function applyBookingFilters<T extends BookingFilterable>(bookingList: T[], zoneList: Pick<ZoneRow, "slug" | "name">[], filters: BookingFilterInput) {
  const normalizedKeyword = filters.keyword?.trim().toLowerCase() ?? "";
  const normalizedPhoneKeyword = filters.keyword?.trim() ?? "";
  const normalizedDate = filters.date?.trim() ?? "";
  const normalizedStatus = filters.status?.trim() ?? "all";
  const normalizedZone = filters.zone?.trim() ?? "all";
  const selectedZoneName = normalizedZone === "all"
    ? undefined
    : zoneList.find((zone) => zone.slug === normalizedZone)?.name;

  return bookingList.filter((booking) => {
    if (normalizedKeyword) {
      const matchesCode = booking.code.toLowerCase().includes(normalizedKeyword);
      const matchesName = booking.customerName.toLowerCase().includes(normalizedKeyword);
      const matchesPhone = booking.customerPhone.includes(normalizedPhoneKeyword);
      if (!matchesCode && !matchesName && !matchesPhone) return false;
    }

    if (normalizedDate && booking.bookingDate !== normalizedDate) return false;
    if (normalizedStatus !== "all" && booking.status !== normalizedStatus) return false;
    if (selectedZoneName && booking.zoneName !== selectedZoneName) return false;

    return true;
  });
}

export function sortBookingsForAttention<T extends BookingAttentionSortable>(bookingList: T[]) {
  return [...bookingList].sort((left, right) => {
    const priorityDiff = getBookingSortPriority(left.depositReviewStatus) - getBookingSortPriority(right.depositReviewStatus);
    if (priorityDiff !== 0) return priorityDiff;
    return getBookingActivityTimestamp(right) - getBookingActivityTimestamp(left);
  });
}

export function sortBookings<T extends BookingSortable>(bookingList: T[], sortState: BookingSortState) {
  if (sortState.key === "attention") {
    const sorted = sortBookingsForAttention(bookingList);
    return sortState.direction === "asc" ? sorted : [...sorted].reverse();
  }

  const direction = sortState.direction === "asc" ? 1 : -1;

  return [...bookingList].sort((left, right) => {
    if (sortState.key === "code") {
      return left.code.localeCompare(right.code, "vi", { numeric: true }) * direction;
    }

    if (sortState.key === "customerName") {
      return left.customerName.localeCompare(right.customerName, "vi") * direction;
    }

    if (sortState.key === "guestCount") {
      return (left.guestCount - right.guestCount) * direction;
    }

    if (sortState.key === "bookingDateTime") {
      return (getBookingDateTimeTimestamp(left) - getBookingDateTimeTimestamp(right)) * direction;
    }

    if (sortState.key === "zoneTable") {
      return getZoneTableSortValue(left).localeCompare(getZoneTableSortValue(right), "vi", { numeric: true }) * direction;
    }

    if (sortState.key === "status") {
      return (getBookingStatusSortPriority(left.status) - getBookingStatusSortPriority(right.status)) * direction;
    }

    return (getBookingSortPriority(left.depositReviewStatus) - getBookingSortPriority(right.depositReviewStatus)) * direction;
  });
}

function getBookingSortPriority(status?: BookingRow["depositReviewStatus"]) {
  if (status === "submitted") return 0;
  if (status === "approved") return 1;
  if (status === "rejected") return 2;
  return 3;
}

function getBookingStatusSortPriority(status: string) {
  if (status === "pending") return 0;
  if (status === "confirmed") return 1;
  if (status === "seated") return 2;
  if (status === "completed") return 3;
  if (status === "cancelled") return 4;
  return 5;
}

function getBookingDateTimeTimestamp(booking: Pick<BookingRow, "bookingDate" | "bookingTime">) {
  const bookingAt = new Date(`${booking.bookingDate}T${booking.bookingTime}`).getTime();
  return Number.isNaN(bookingAt) ? 0 : bookingAt;
}

function getZoneTableSortValue(booking: Pick<BookingRow, "zoneName" | "tableCode">) {
  return `${getBookingZoneFallback(booking.zoneName)} ${getBookingTableFallback(booking.tableCode)}`;
}

function getBookingActivityTimestamp(booking: BookingAttentionSortable) {
  if (booking.depositReviewStatus === "approved" || booking.depositReviewStatus === "rejected") {
    const reviewedAt = booking.depositReviewedAt ? new Date(booking.depositReviewedAt).getTime() : Number.NaN;
    if (!Number.isNaN(reviewedAt)) return reviewedAt;
  }

  return getBookingDateTimeTimestamp(booking);
}

export function getBookingStatusLabel(status: BookingRow["status"]) {
  if (status === "pending") return "Chờ xác nhận";
  if (status === "confirmed") return "Đã xác nhận";
  if (status === "seated") return "Đã check-in";
  if (status === "completed") return "Hoàn thành";
  if (status === "cancelled") return "Đã huỷ";
  return "Không đến";
}

export function getDepositReviewStatusLabel(status?: BookingRow["depositReviewStatus"] | null) {
  if (status === "submitted") return "Chờ duyệt bill";
  if (status === "approved") return "Bill hợp lệ";
  if (status === "rejected") return "Bill bị từ chối";
  return "Chưa gửi bill";
}

export function formatBookingReviewTimestamp(value?: Date | string | null) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function hasBookingFilters(filters: BookingFilterInput) {
  return Boolean(
    filters.keyword?.trim()
    || filters.date?.trim()
    || (filters.status?.trim() && filters.status !== "all")
    || (filters.zone?.trim() && filters.zone !== "all"),
  );
}

export function buildBookingExportFilename(filters: BookingFilterInput) {
  const date = getTodayDateString();
  return hasBookingFilters(filters) ? `bookings-${date}-filtered.xlsx` : `bookings-${date}.xlsx`;
}

export function getBookingZoneFallback(zoneName?: string | null) {
  return zoneName ?? "Chưa gán khu";
}

export function getBookingTableFallback(tableCode?: string | null) {
  return tableCode ?? "Chưa gán bàn";
}

export function parseBookingFilterInput(searchParams: URLSearchParams): BookingFilterInput {
  return {
    keyword: searchParams.get("keyword"),
    date: searchParams.get("date"),
    status: searchParams.get("status"),
    zone: searchParams.get("zone"),
  };
}

export function mapBookingToExportRow(booking: BookingRow) {
  return {
    code: booking.code,
    customerName: booking.customerName,
    customerPhone: booking.customerPhone,
    bookingDate: formatDate(booking.bookingDate),
    bookingTime: booking.bookingTime,
    guestCount: booking.guestCount,
    bookingStatus: getBookingStatusLabel(booking.status),
    depositReviewStatus: getDepositReviewStatusLabel(booking.depositReviewStatus),
    depositReviewedAt: formatBookingReviewTimestamp(booking.depositReviewedAt),
    depositReviewNote: booking.depositReviewNote ?? "",
    zoneName: getBookingZoneFallback(booking.zoneName),
    tableCode: getBookingTableFallback(booking.tableCode),
    note: booking.note ?? "",
  };
}

export type BookingExportRow = ReturnType<typeof mapBookingToExportRow>;

export function getBookingFilterSummary(filters: BookingFilterInput, zoneList: Pick<ZoneRow, "slug" | "name">[]) {
  const selectedZoneName = filters.zone?.trim() && filters.zone !== "all"
    ? zoneList.find((zone) => zone.slug === filters.zone)?.name ?? filters.zone
    : "Tất cả khu vực";

  return {
    keyword: filters.keyword?.trim() || "Tất cả",
    date: formatDate(filters.date?.trim()) || "Tất cả",
    status: filters.status?.trim() && filters.status !== "all" ? getBookingStatusLabel(filters.status as BookingRow["status"]) : "Tất cả",
    zone: selectedZoneName,
  };
}
