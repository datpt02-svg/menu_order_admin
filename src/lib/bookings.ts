import type { BookingRow, ZoneRow } from "@/lib/server/serializers";

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

function getBookingSortPriority(status?: BookingRow["depositReviewStatus"]) {
  if (status === "submitted") return 0;
  if (status === "approved") return 1;
  if (status === "rejected") return 2;
  return 3;
}

function getBookingActivityTimestamp(booking: BookingAttentionSortable) {
  if (booking.depositReviewStatus === "approved" || booking.depositReviewStatus === "rejected") {
    const reviewedAt = booking.depositReviewedAt ? new Date(booking.depositReviewedAt).getTime() : Number.NaN;
    if (!Number.isNaN(reviewedAt)) return reviewedAt;
  }

  const bookingAt = new Date(`${booking.bookingDate}T${booking.bookingTime}`).getTime();
  return Number.isNaN(bookingAt) ? 0 : bookingAt;
}

export function getBookingStatusLabel(status: BookingRow["status"]) {
  if (status === "pending") return "Chờ xác nhận";
  if (status === "confirmed") return "Đã xác nhận";
  if (status === "seated") return "Đã check-in";
  if (status === "completed") return "Hoàn thành";
  if (status === "cancelled") return "Đã huỷ";
  return "No-show";
}

export function getDepositReviewStatusLabel(status: BookingRow["depositReviewStatus"]) {
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
  const date = new Date().toISOString().slice(0, 10);
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
    bookingDate: booking.bookingDate,
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
    date: filters.date?.trim() || "Tất cả",
    status: filters.status?.trim() && filters.status !== "all" ? getBookingStatusLabel(filters.status as BookingRow["status"]) : "Tất cả",
    zone: selectedZoneName,
  };
}
