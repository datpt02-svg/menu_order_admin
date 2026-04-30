"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowUpDown, Calendar, Search, Users } from "lucide-react";
import { useRouter } from "next/navigation";

import { applyBookingFilters } from "@/lib/bookings";

import { updateBookingStatusAction } from "@/app/(admin)/actions";
import { BookingStatusDropdown, getBookingStatusOptions, type BookingStatus } from "@/components/admin/booking-status-dropdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FieldLabel, Input, Select } from "@/components/ui/field";
import { Pagination } from "@/components/ui/pagination";
import { formatDate } from "@/lib/utils";
import { SectionHeading } from "./section-heading";

type BookingItem = {
  id: number;
  code: string;
  customerName: string;
  customerPhone: string;
  bookingDate: string;
  bookingTime: string;
  guestCount: number;
  status: string;
  zoneName?: string | null;
  tableCode?: string | null;
};

type ZoneItem = {
  id: number;
  slug: string;
  name: string;
};

type ActionValidationResult = {
  ok: boolean;
  fieldErrors?: Record<string, string>;
  formError?: string;
};

type RecentBookingsProps = {
  bookings: BookingItem[];
  zones: ZoneItem[];
};

type RecentBookingSortKey = "code" | "customerName" | "guestCount" | "bookingDateTime" | "zoneTable" | "status";
type SortDirection = "asc" | "desc";

function getDateTimeValue(booking: BookingItem) {
  const timestamp = new Date(`${booking.bookingDate}T${booking.bookingTime}`).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getZoneTableValue(booking: BookingItem) {
  return `${booking.zoneName ?? "Chưa gán khu"} ${booking.tableCode ?? "Chưa gán bàn"}`;
}

export function RecentBookings({ bookings, zones }: RecentBookingsProps) {
  const router = useRouter();
  const bookingStatusOptions = getBookingStatusOptions();
  const [keywordFilter, setKeywordFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">("all");
  const [dateFilter, setDateFilter] = useState("");
  const [statusTargetId, setStatusTargetId] = useState<number | null>(null);
  const [optimisticStatuses, setOptimisticStatuses] = useState<Record<number, BookingStatus>>({});
  const [sortState, setSortState] = useState<{ key: RecentBookingSortKey; direction: SortDirection }>({
    key: "bookingDateTime",
    direction: "desc",
  });
  const [page, setPage] = useState(1);
  const [, startTransition] = useTransition();

  const ROWS_PER_PAGE = 5;

  const bookingsWithOptimisticStatus = useMemo(() => bookings.map((booking) => ({
    ...booking,
    status: optimisticStatuses[booking.id] ?? booking.status,
  })), [bookings, optimisticStatuses]);

  const filteredBookings = useMemo(() => applyBookingFilters(bookingsWithOptimisticStatus, zones, {
    keyword: keywordFilter,
    date: dateFilter,
    status: statusFilter,
    zone: "all",
  }), [bookingsWithOptimisticStatus, dateFilter, keywordFilter, statusFilter, zones]);

  const orderedBookings = useMemo(() => {
    const direction = sortState.direction === "asc" ? 1 : -1;
    return [...filteredBookings].sort((left, right) => {
      if (sortState.key === "code") return left.code.localeCompare(right.code, "vi", { numeric: true }) * direction;
      if (sortState.key === "customerName") return left.customerName.localeCompare(right.customerName, "vi") * direction;
      if (sortState.key === "guestCount") return (left.guestCount - right.guestCount) * direction;
      if (sortState.key === "bookingDateTime") return (getDateTimeValue(left) - getDateTimeValue(right)) * direction;
      if (sortState.key === "zoneTable") return getZoneTableValue(left).localeCompare(getZoneTableValue(right), "vi", { numeric: true }) * direction;
      return left.status.localeCompare(right.status, "vi") * direction;
    });
  }, [filteredBookings, sortState]);

  const handleSort = (key: RecentBookingSortKey) => {
    setSortState((current) => {
      if (current.key === key) return { key, direction: current.direction === "asc" ? "desc" : "asc" };
      return { key, direction: key === "bookingDateTime" ? "desc" : "asc" };
    });
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(orderedBookings.length / ROWS_PER_PAGE));
  const visiblePage = Math.min(page, totalPages);
  const startIndex = (visiblePage - 1) * ROWS_PER_PAGE;
  const paginatedBookings = orderedBookings.slice(startIndex, startIndex + ROWS_PER_PAGE);

  const updateBookingStatus = (id: number, status: BookingStatus) => {
    setStatusTargetId(id);
    setOptimisticStatuses((current) => ({ ...current, [id]: status }));

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("id", String(id));
        formData.append("status", status);
        const result = (await updateBookingStatusAction(formData)) as ActionValidationResult;
        if (!result.ok) {
          setOptimisticStatuses((current) => {
            const next = { ...current };
            delete next[id];
            return next;
          });
          setStatusTargetId(null);
          return;
        }

        router.refresh();
      } finally {
        setStatusTargetId(null);
      }
    });
  };

  const renderSortHeader = (label: string, key: RecentBookingSortKey, className?: string) => (
    <button
      type="button"
      className={`inline-flex items-center gap-1 text-left font-semibold text-[var(--muted)] transition hover:text-[var(--forest-dark)] ${className ?? ""}`}
      onClick={() => handleSort(key)}
    >
      <span>{label}</span>
      <ArrowUpDown className={sortState.key === key ? "h-3.5 w-3.5 text-[var(--forest)]" : "h-3.5 w-3.5 opacity-60"} />
    </button>
  );

  return (
    <Card>
      <CardContent>
        <SectionHeading
          title="Booking hôm nay"
          description="Danh sách toàn bộ booking diễn ra trong ngày hôm nay."
        />

        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <div>
            <FieldLabel>Từ khóa</FieldLabel>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <Input
                className="pl-10"
                placeholder="Mã, tên khách, SĐT"
                value={keywordFilter}
                onChange={(event) => {
                  setKeywordFilter(event.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
          <div>
            <FieldLabel>Ngày</FieldLabel>
            <Input type="date" value={dateFilter} onChange={(event) => {
              setDateFilter(event.target.value);
              setPage(1);
            }} />
          </div>
          <div>
            <FieldLabel>Trạng thái</FieldLabel>
            <Select value={statusFilter} onChange={(event) => {
              setStatusFilter(event.target.value as BookingStatus | "all");
              setPage(1);
            }}>
              <option value="all">Tất cả</option>
              {bookingStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto admin-scrollbar">
          <table className="min-w-full table-fixed text-sm">
            <colgroup>
              <col className="w-[12%]" />
              <col className="w-[18%]" />
              <col className="w-[11%]" />
              <col className="w-[19%]" />
              <col className="w-[22%]" />
              <col className="w-[18%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-[color:var(--line)] text-left text-[var(--muted)]">
                <th className="pb-3 pr-4">{renderSortHeader("Mã", "code")}</th>
                <th className="pb-3 pr-4">{renderSortHeader("Khách", "customerName")}</th>
                <th className="whitespace-nowrap pb-3 pr-4">{renderSortHeader("Số khách", "guestCount", "whitespace-nowrap")}</th>
                <th className="pb-3 pr-4">{renderSortHeader("Ngày giờ", "bookingDateTime")}</th>
                <th className="pb-3 pr-4">{renderSortHeader("Khu vực / Bàn", "zoneTable")}</th>
                <th className="whitespace-nowrap pb-3 pr-4">{renderSortHeader("Trạng thái", "status", "whitespace-nowrap")}</th>
              </tr>
            </thead>
            <tbody>
              {orderedBookings.length === 0 ? (
                <>
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-sm text-[var(--muted)]">
                      Không tìm thấy booking nào
                    </td>
                  </tr>
                  {Array.from({ length: ROWS_PER_PAGE - 1 }).map((_, i) => (
                    <tr key={`phantom-empty-${i}`} aria-hidden="true">
                      <td className="py-4 pr-4"><span className="invisible">-</span></td>
                      <td className="py-4 pr-4"><div className="invisible">-</div><div className="invisible">-</div></td>
                      <td className="py-4 pr-4" />
                      <td className="py-4 pr-4" />
                      <td className="py-4 pr-4" />
                      <td className="py-4 pr-4" />
                    </tr>
                  ))}
                </>
              ) : (
                <>
                  {paginatedBookings.map((booking) => (
                    <tr key={booking.id} className="border-b border-[color:rgba(63,111,66,0.08)] last:border-0 hover:bg-white/40">
                      <td className="py-4 pr-4 font-semibold text-[var(--forest-dark)] break-all">{booking.code}</td>
                      <td className="py-4 pr-4 align-top">
                        <div className="break-words font-semibold text-[var(--forest-dark)]">{booking.customerName}</div>
                        <div className="break-all text-[var(--muted)]">{booking.customerPhone}</div>
                      </td>
                      <td className="py-4 pr-4 align-top">
                        <div className="flex items-center gap-1.5 font-semibold text-[var(--forest)]">
                          <Users className="h-3.5 w-3.5" />
                          {booking.guestCount}
                        </div>
                      </td>
                      <td className="py-4 pr-4 align-top text-[var(--muted)]">
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(booking.bookingDate)}
                        </div>
                        <div className="ml-5 whitespace-nowrap">{booking.bookingTime}</div>
                      </td>
                      <td className="py-4 pr-4 align-top text-[var(--muted)]">
                        <div className="break-words">
                          {booking.zoneName ?? "Chưa gán khu"} / <span className="font-semibold text-[var(--forest-dark)]">{booking.tableCode ?? "Chưa gán bàn"}</span>
                        </div>
                      </td>
                      <td className="py-4 pr-4 align-top">
                        <BookingStatusDropdown
                          bookingId={booking.id}
                          status={booking.status}
                          isStatusPending={statusTargetId === booking.id}
                          onUpdate={updateBookingStatus}
                        />
                      </td>
                    </tr>
                  ))}
                  {Array.from({ length: Math.max(0, ROWS_PER_PAGE - paginatedBookings.length) }).map((_, i) => (
                    <tr key={`phantom-${i}`} aria-hidden="true">
                      <td className="py-4 pr-4"><span className="invisible">-</span></td>
                      <td className="py-4 pr-4"><div className="invisible">-</div><div className="invisible">-</div></td>
                      <td className="py-4 pr-4" />
                      <td className="py-4 pr-4" />
                      <td className="py-4 pr-4" />
                      <td className="py-4 pr-4" />
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 ? (
          <div className="mt-4 flex items-center justify-end border-t border-[color:rgba(63,111,66,0.08)] pt-4">
            <Pagination
              currentPage={visiblePage}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
