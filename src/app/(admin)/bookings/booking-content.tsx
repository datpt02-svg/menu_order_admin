"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Download, Edit, Plus, Save, AlertTriangle, CheckCircle2, XCircle, Search, Calendar, Users, ReceiptText } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { applyBookingFilters, sortBookingsForAttention } from "@/lib/bookings";
import { cn } from "@/lib/utils";

import { deleteBookingAction, reviewBookingDepositAction, saveBookingAction } from "@/app/(admin)/actions";
import { ClearHighlightQuery } from "@/components/admin/clear-highlight-query";
import { RealtimeSync } from "@/components/admin/realtime-sync";
import { SectionHeading } from "@/components/admin/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FieldError, FieldLabel, Input, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";

type BookingStatus = "pending" | "confirmed" | "seated" | "completed" | "cancelled" | "no_show";
type DepositReviewStatus = "not_submitted" | "submitted" | "approved" | "rejected";

type BookingItem = {
  id: number;
  code: string;
  customerName: string;
  customerPhone: string;
  bookingDate: string;
  bookingTime: string;
  guestCount: number;
  status: string;
  depositSlipPath?: string | null;
  depositSlipUrl?: string | null;
  depositReviewStatus?: DepositReviewStatus;
  depositReviewedAt?: Date | string | null;
  depositReviewNote?: string | null;
  tableCode?: string | null;
  zoneName?: string | null;
  note?: string | null;
};

type ZoneItem = {
  id: number;
  slug: string;
  name: string;
};

type BookingContentProps = {
  initialData: {
    bookings: BookingItem[];
    zones: ZoneItem[];
  };
  highlightedBookingId?: number;
};

type ActionValidationResult = {
  ok: boolean;
  fieldErrors?: Record<string, string>;
  formError?: string;
};

function getDepositTone(status?: BookingItem["depositReviewStatus"]) {
  if (status === "submitted") return "warning" as const;
  if (status === "approved") return "success" as const;
  if (status === "rejected") return "danger" as const;
  return "default" as const;
}

function getDepositLabel(status?: BookingItem["depositReviewStatus"]) {
  if (status === "submitted") return "Chờ duyệt bill";
  if (status === "approved") return "Bill hợp lệ";
  if (status === "rejected") return "Bill bị từ chối";
  return "Chưa gửi bill";
}

function formatDepositReviewTime(value?: Date | string | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
}

function buildDepositStatusText(booking: BookingItem) {
  const base = getDepositLabel(booking.depositReviewStatus);
  if (booking.depositReviewStatus === "rejected" && booking.depositReviewNote) {
    return `${base}: ${booking.depositReviewNote}`;
  }
  return base;
}

function getBookingHighlightTone(booking: BookingItem) {
  if (booking.depositReviewStatus === "submitted") {
    return "bg-[rgba(185,140,42,0.14)] shadow-[inset_0_0_0_1px_rgba(185,140,42,0.32)]";
  }
  return "bg-[rgba(185,140,42,0.14)] shadow-[inset_0_0_0_1px_rgba(185,140,42,0.32)]";
}

function getDepositNotificationBookingId(searchParams: ReturnType<typeof useSearchParams>) {
  const bookingIdParam = searchParams.get("bookingId");
  if (!bookingIdParam) return undefined;
  const parsed = Number(bookingIdParam);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function getReviewFromSearchParams(searchParams: ReturnType<typeof useSearchParams>) {
  return searchParams.get("review") === "deposit";
}

function getPublicImageUrl(path?: string | null) {
  if (!path) return null;
  return path;
}

function shouldOpenDepositReview(booking?: BookingItem) {
  return booking?.depositReviewStatus === "submitted" && Boolean(booking.depositSlipPath || booking.depositSlipUrl);
}

function getPendingDepositCount(bookings: BookingItem[]) {
  return bookings.filter((booking) => booking.depositReviewStatus === "submitted").length;
}

function getRejectedDepositCount(bookings: BookingItem[]) {
  return bookings.filter((booking) => booking.depositReviewStatus === "rejected").length;
}

function getApprovedDepositCount(bookings: BookingItem[]) {
  return bookings.filter((booking) => booking.depositReviewStatus === "approved").length;
}

function getBookingTone(status: string) {
  if (status === "pending") return "warning" as const;
  if (status === "seated") return "info" as const;
  if (status === "confirmed") return "success" as const;
  if (status === "cancelled") return "danger" as const;
  return "success" as const;
}

export function BookingContent({ initialData, highlightedBookingId }: BookingContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [activeHighlightId, setActiveHighlightId] = useState<number | undefined>(highlightedBookingId);
  const [keywordFilter, setKeywordFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">("all");
  const [zoneFilter, setZoneFilter] = useState("all");
  const { bookings, zones } = initialData;
  const filteredBookings = useMemo(() => applyBookingFilters(bookings, zones, {
    keyword: keywordFilter,
    date: dateFilter,
    status: statusFilter,
    zone: zoneFilter,
  }), [bookings, dateFilter, keywordFilter, statusFilter, zoneFilter, zones]);
  const orderedBookings = useMemo(() => sortBookingsForAttention(filteredBookings), [filteredBookings]);
  const pendingDepositCount = useMemo(() => getPendingDepositCount(bookings), [bookings]);
  const approvedDepositCount = useMemo(() => getApprovedDepositCount(bookings), [bookings]);
  const rejectedDepositCount = useMemo(() => getRejectedDepositCount(bookings), [bookings]);
  const requestedDepositReviewBookingId = getDepositNotificationBookingId(searchParams);
  const shouldOpenDepositFromQuery = getReviewFromSearchParams(searchParams);
  const rowRefs = useRef<Record<number, HTMLTableRowElement | null>>({});

  const exportUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (keywordFilter.trim()) params.set("keyword", keywordFilter.trim());
    if (dateFilter) params.set("date", dateFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (zoneFilter !== "all") params.set("zone", zoneFilter);
    const query = params.toString();
    return query ? `/api/bookings/export?${query}` : "/api/bookings/export";
  }, [dateFilter, keywordFilter, statusFilter, zoneFilter]);

  useEffect(() => {
    setActiveHighlightId(highlightedBookingId);
  }, [highlightedBookingId]);

  useEffect(() => {
    if (!activeHighlightId) return;

    const targetRow = rowRefs.current[activeHighlightId];
    if (targetRow) {
      targetRow.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    const timer = window.setTimeout(() => {
      setActiveHighlightId(undefined);
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [activeHighlightId]);

  const assignRowRef = (id: number) => (node: HTMLTableRowElement | null) => {
    rowRefs.current[id] = node;
  };

  const isHighlightedBooking = (id: number) => activeHighlightId === id;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingItem | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState<number | null>(null);

  const clearFieldError = (field: string) => {
    if (!fieldErrors[field] && !formError) return undefined;
    return () => {
      setFieldErrors((current) => {
        if (!current[field]) return current;
        const next = { ...current };
        delete next[field];
        return next;
      });
      setFormError(null);
    };
  };

  const hasError = (field: string) => Boolean(fieldErrors[field]);

  const handleBookingSave = async (formData: FormData) => {
    setFieldErrors({});
    setFormError(null);

    startTransition(async () => {
      try {
        const result = (await saveBookingAction(formData)) as ActionValidationResult;
        if (!result.ok) {
          setFieldErrors(result.fieldErrors || {});
          setFormError(result.formError || null);
          return;
        }

        setIsModalOpen(false);
        router.refresh();
      } catch {
        setFormError("Không thể lưu booking lúc này. Vui lòng thử lại.");
      }
    });
  };

  useEffect(() => {
    if (!isModalOpen) return;
    setFieldErrors({});
    setFormError(null);
  }, [isModalOpen, selectedBooking]);

  useEffect(() => {
    if (!shouldOpenDepositFromQuery || !requestedDepositReviewBookingId) return;
    const booking = bookings.find((item) => item.id === requestedDepositReviewBookingId);
    if (!shouldOpenDepositReview(booking)) return;
    setActiveHighlightId(requestedDepositReviewBookingId);
    setSelectedBooking(booking ?? null);
    setIsModalOpen(true);
  }, [bookings, requestedDepositReviewBookingId, shouldOpenDepositFromQuery]);

  const handleStatusUpdate = async (id: number, status: string) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append("id", String(id));
      formData.append("status", status);

      const booking = bookings.find((b) => b.id === id);
      if (booking) {
        formData.append("code", booking.code);
        formData.append("customerName", booking.customerName);
        formData.append("customerPhone", booking.customerPhone);
        formData.append("bookingDate", booking.bookingDate);
        formData.append("bookingTime", booking.bookingTime);
        formData.append("guestCount", String(booking.guestCount));
        formData.append("zoneSlug", zones.find((z) => z.name === booking.zoneName)?.slug || "all");
        formData.append("tableCode", booking.tableCode || "");
        formData.append("note", booking.note || "");
      }

      const result = await saveBookingAction(formData);
      if (!result.ok) {
        return;
      }
      setIsCancelConfirmOpen(false);
      router.refresh();
    });
  };

  const handleBookingModalClose = () => {
    setFieldErrors({});
    setFormError(null);
    setIsModalOpen(false);
  };

  const handleEdit = (booking: BookingItem) => {
    setSelectedBooking(booking);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedBooking(null);
    setIsModalOpen(true);
  };

  const confirmCancel = (id: number) => {
    setCancelTargetId(id);
    setIsCancelConfirmOpen(true);
  };

  const handleExport = () => {
    window.location.href = exportUrl;
  };

  return (
    <>
      <RealtimeSync events={["booking:created", "booking:updated"]} />
      <ClearHighlightQuery keys={["bookingId", "review"]} />
      <div className="space-y-4">
        <Card>
          <CardContent>
            <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-[var(--line)] bg-[rgba(63,111,66,0.04)] p-4 text-center shadow-sm">
                <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">Tổng booking</div>
                <div className="mt-1 text-3xl font-bold tracking-tight text-[var(--forest-dark)]">{bookings.length}</div>
              </div>

              <div className="rounded-2xl border border-[rgba(180,140,40,0.1)] bg-[rgba(180,140,40,0.06)] p-4 text-center shadow-sm">
                <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#a5842e]">Chờ duyệt bill</div>
                <div className="mt-1 text-3xl font-bold tracking-tight text-[#8c6d1f]">{pendingDepositCount}</div>
              </div>

              <div className="rounded-2xl border border-[rgba(63,111,66,0.15)] bg-[rgba(63,111,66,0.1)] p-4 text-center shadow-sm">
                <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--forest)]">Bill hợp lệ</div>
                <div className="mt-1 text-3xl font-bold tracking-tight text-[var(--forest-dark)]">{approvedDepositCount}</div>
              </div>

              <div className="rounded-2xl border border-[rgba(159,75,62,0.12)] bg-[rgba(159,75,62,0.08)] p-4 text-center shadow-sm">
                <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#8a3527]">Cần gửi lại bill</div>
                <div className="mt-1 text-3xl font-bold tracking-tight text-[#8a3527]">{rejectedDepositCount}</div>
              </div>
            </div>

            {pendingDepositCount > 0 ? (
              <div className="mb-6 rounded-[24px] border border-[rgba(185,140,42,0.18)] bg-[rgba(185,140,42,0.08)] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-bold uppercase tracking-[0.12em] text-[#8c6d1f]">Cần admin xác nhận bill cọc</div>
                    <p className="mt-2 text-sm leading-6 text-[#7a5b0f]">
                      Có {pendingDepositCount} booking đang chờ duyệt bill cọc. Bấm vào icon bill trong danh sách để mở modal xác nhận.
                    </p>
                  </div>
                  <ReceiptText className="h-5 w-5 text-[#8c6d1f]" />
                </div>
              </div>
            ) : null}

            <SectionHeading title="Bộ lọc nâng cao" description="Lọc theo ngày, trạng thái và khu vực để quản lý luồng khách hiệu quả." />
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <FieldLabel>Từ khóa</FieldLabel>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                  <Input
                    className="pl-10"
                    placeholder="Mã booking, tên khách, SĐT"
                    value={keywordFilter}
                    onChange={(event) => setKeywordFilter(event.target.value)}
                  />
                </div>
              </div>
              <div>
                <FieldLabel>Ngày</FieldLabel>
                <Input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
              </div>
              <div>
                <FieldLabel>Trạng thái</FieldLabel>
                <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as BookingStatus | "all")}>
                  <option value="all">Tất cả</option>
                  <option value="pending">Chờ xác nhận</option>
                  <option value="confirmed">Đã xác nhận</option>
                  <option value="seated">Đã check-in</option>
                  <option value="completed">Hoàn thành</option>
                  <option value="cancelled">Đã huỷ</option>
                </Select>
              </div>
              <div>
                <FieldLabel>Khu vực</FieldLabel>
                <Select value={zoneFilter} onChange={(event) => setZoneFilter(event.target.value)}>
                  <option value="all">Tất cả khu vực</option>
                  {zones.map((zone) => (
                    <option key={zone.id} value={zone.slug}>{zone.name}</option>
                  ))}
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <SectionHeading
              title="Danh sách Booking"
              description="Quản lý chi tiết từng booking, gán bàn và theo dõi trạng thái phục vụ."
              actions={
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleExport}>
                    <Download className="h-4 w-4" />
                    Xuất Excel
                  </Button>
                  <Button size="sm" onClick={handleAdd}>
                    <Plus className="h-4 w-4" />
                    Thêm booking
                  </Button>
                </div>
              }
            />
            <div className="overflow-x-auto admin-scrollbar">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-[color:var(--line)] text-left text-[var(--muted)]">
                    <th className="pb-3 font-semibold">Mã</th>
                    <th className="pb-3 font-semibold">Khách</th>
                    <th className="pb-3 font-semibold">Số khách</th>
                    <th className="pb-3 font-semibold">Ngày giờ</th>
                    <th className="pb-3 font-semibold">Khu vực / Bàn</th>
                    <th className="pb-3 font-semibold">Trạng thái</th>
                    <th className="pb-3 font-semibold text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {orderedBookings.map((booking) => (
                    <tr
                      key={booking.id}
                      ref={assignRowRef(booking.id)}
                      className={cn(
                        "border-b border-[color:rgba(63,111,66,0.08)] last:border-0 hover:bg-white/40",
                        isHighlightedBooking(booking.id) && getBookingHighlightTone(booking),
                      )}
                    >
                      <td className="py-4 pr-4 font-semibold text-[var(--forest-dark)]">{booking.code}</td>
                      <td className="py-4 pr-4">
                        <div className="font-semibold text-[var(--forest-dark)]">{booking.customerName}</div>
                        <div className="text-[var(--muted)]">{booking.customerPhone}</div>
                      </td>
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-1.5 font-semibold text-[var(--forest)]">
                          <Users className="h-3.5 w-3.5" />
                          {booking.guestCount}
                        </div>
                      </td>
                      <td className="py-4 pr-4 text-[var(--muted)]">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {booking.bookingDate}
                        </div>
                        <div className="ml-5">{booking.bookingTime}</div>
                      </td>
                      <td className="py-4 pr-4 text-[var(--muted)]">
                        <div>
                          {booking.zoneName ?? "Chưa gán khu"} / <span className="font-semibold text-[var(--forest-dark)]">{booking.tableCode ?? "Chưa gán bàn"}</span>
                        </div>
                        <div className="mt-2">
                          <Badge tone={getDepositTone(booking.depositReviewStatus)}>{getDepositLabel(booking.depositReviewStatus)}</Badge>
                        </div>
                        {(booking.depositReviewStatus === "rejected" || booking.depositReviewStatus === "approved") && formatDepositReviewTime(booking.depositReviewedAt) ? (
                          <div className="mt-2 text-xs text-[var(--muted)]">{formatDepositReviewTime(booking.depositReviewedAt)}</div>
                        ) : null}
                        {booking.depositReviewStatus === "rejected" && booking.depositReviewNote ? (
                          <div className="mt-2 text-xs text-[#8a3527]">{booking.depositReviewNote}</div>
                        ) : null}
                      </td>
                      <td className="py-4">
                        <div className="flex flex-col gap-2">
                          <Badge tone={getBookingTone(booking.status)}>{booking.status}</Badge>
                          <div className="text-xs text-[var(--muted)]">{buildDepositStatusText(booking)}</div>
                        </div>
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {shouldOpenDepositReview(booking) ? (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-[#8c6d1f] hover:bg-[rgba(185,140,42,0.1)]"
                              onClick={() => {
                                setSelectedBooking(booking);
                                setIsModalOpen(true);
                              }}
                            >
                              <ReceiptText className="h-4 w-4" />
                            </Button>
                          ) : null}
                          {booking.status === "pending" && booking.depositReviewStatus !== "submitted" && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-green-600 hover:bg-green-50"
                              onClick={() => handleStatusUpdate(booking.id, "confirmed")}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon-sm" onClick={() => handleEdit(booking)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => confirmCancel(booking.id)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Modal
          isOpen={isModalOpen}
          onClose={handleBookingModalClose}
          title={selectedBooking && shouldOpenDepositReview(selectedBooking) ? "Xác nhận bill cọc" : selectedBooking ? "Chi tiết Booking" : "Thêm Booking mới"}
          className={selectedBooking && shouldOpenDepositReview(selectedBooking) ? "max-w-4xl" : undefined}
        >
          {selectedBooking && shouldOpenDepositReview(selectedBooking) ? (
            <div className="space-y-6">
              {formError ? (
                <div className="rounded-[16px] border border-[rgba(159,75,62,0.18)] bg-[rgba(159,75,62,0.08)] px-4 py-3 text-sm text-[#8a3527]">
                  {formError}
                </div>
              ) : null}

              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                <div className="space-y-4">
                  <div className="overflow-hidden rounded-[24px] border border-[color:var(--line)] bg-white/70">
                    {getPublicImageUrl(selectedBooking.depositSlipUrl || selectedBooking.depositSlipPath) ? (
                      <Image
                        src={getPublicImageUrl(selectedBooking.depositSlipUrl || selectedBooking.depositSlipPath) || ""}
                        alt={`Bill coc ${selectedBooking.code}`}
                        width={1200}
                        height={1200}
                        className="h-auto w-full object-contain"
                        unoptimized
                      />
                    ) : (
                      <div className="flex min-h-[360px] items-center justify-center text-sm text-[var(--muted)]">Không tìm thấy ảnh bill cọc.</div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="danger"
                      className="min-w-0 flex-1 whitespace-nowrap"
                      disabled={isPending}
                      onClick={() => {
                        startTransition(async () => {
                          const formData = new FormData();
                          formData.append("id", String(selectedBooking.id));
                          formData.append("decision", "rejected");
                          const result = (await reviewBookingDepositAction(formData)) as ActionValidationResult;
                          if (!result.ok) {
                            setFieldErrors(result.fieldErrors || {});
                            setFormError(result.formError || null);
                            return;
                          }
                          setIsModalOpen(false);
                          router.refresh();
                        });
                      }}
                    >
                      <XCircle className="h-4 w-4" />
                      Không xác nhận
                    </Button>
                    <Button
                      type="button"
                      className="min-w-0 flex-1 whitespace-nowrap"
                      disabled={isPending}
                      onClick={() => {
                        startTransition(async () => {
                          const formData = new FormData();
                          formData.append("id", String(selectedBooking.id));
                          formData.append("decision", "approved");
                          const result = (await reviewBookingDepositAction(formData)) as ActionValidationResult;
                          if (!result.ok) {
                            setFieldErrors(result.fieldErrors || {});
                            setFormError(result.formError || null);
                            return;
                          }
                          setIsModalOpen(false);
                          router.refresh();
                        });
                      }}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Xác nhận bill cọc
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-[24px] border border-[color:var(--line)] bg-white/75 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold uppercase tracking-[0.12em] text-[var(--mint-deep)]">{selectedBooking.code}</div>
                        <div className="mt-2 break-words text-xl font-semibold text-[var(--forest-dark)]">{selectedBooking.customerName}</div>
                      </div>
                      <Badge tone={getDepositTone(selectedBooking.depositReviewStatus)} className="shrink-0 whitespace-nowrap">
                        {getDepositLabel(selectedBooking.depositReviewStatus)}
                      </Badge>
                    </div>
                    <div className="mt-4 space-y-2 text-sm text-[var(--muted)]">
                      <div>SĐT: {selectedBooking.customerPhone}</div>
                      <div>Lịch: {selectedBooking.bookingDate} · {selectedBooking.bookingTime}</div>
                      <div>Số khách: {selectedBooking.guestCount}</div>
                      <div>Vị trí: {selectedBooking.zoneName ?? "Chưa gán khu"} / {selectedBooking.tableCode ?? "Chưa gán bàn"}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <form action={handleBookingSave} className="space-y-4">
              {selectedBooking && <input type="hidden" name="id" value={selectedBooking.id} />}

              <div className="grid gap-4 md:grid-cols-2">
                {formError && (
                  <div className="md:col-span-2 rounded-[16px] border border-[rgba(159,75,62,0.18)] bg-[rgba(159,75,62,0.08)] px-4 py-3 text-sm text-[#8a3527]">
                    {formError}
                  </div>
                )}
                <div>
                  <FieldLabel>Mã booking</FieldLabel>
                  <Input name="code" defaultValue={selectedBooking?.code} placeholder="Để trống để tự tạo" onChange={clearFieldError("code")} invalid={hasError("code")} />
                  <FieldError>{fieldErrors.code}</FieldError>
                </div>
                <div>
                  <FieldLabel>Trạng thái</FieldLabel>
                  <Select name="status" defaultValue={selectedBooking?.status || "pending"} onChange={clearFieldError("status")} invalid={hasError("status")}>
                    <option value="pending">Chờ xác nhận</option>
                    <option value="confirmed">Đã xác nhận</option>
                    <option value="seated">Đã check-in</option>
                    <option value="completed">Hoàn thành</option>
                    <option value="cancelled">Đã huỷ</option>
                    <option value="no_show">No-show</option>
                  </Select>
                  <FieldError>{fieldErrors.status}</FieldError>
                </div>
                <div>
                  <FieldLabel>Tên khách hàng</FieldLabel>
                  <Input name="customerName" defaultValue={selectedBooking?.customerName} required onChange={clearFieldError("customerName")} invalid={hasError("customerName")} />
                  <FieldError>{fieldErrors.customerName}</FieldError>
                </div>
                <div>
                  <FieldLabel>Số điện thoại</FieldLabel>
                  <Input name="customerPhone" defaultValue={selectedBooking?.customerPhone} required onChange={clearFieldError("customerPhone")} invalid={hasError("customerPhone")} />
                  <FieldError>{fieldErrors.customerPhone}</FieldError>
                </div>
                <div>
                  <FieldLabel>Ngày đặt</FieldLabel>
                  <Input name="bookingDate" type="date" defaultValue={selectedBooking?.bookingDate} required onChange={clearFieldError("bookingDate")} invalid={hasError("bookingDate")} />
                  <FieldError>{fieldErrors.bookingDate}</FieldError>
                </div>
                <div>
                  <FieldLabel>Giờ đặt</FieldLabel>
                  <Input name="bookingTime" type="time" defaultValue={selectedBooking?.bookingTime} required onChange={clearFieldError("bookingTime")} invalid={hasError("bookingTime")} />
                  <FieldError>{fieldErrors.bookingTime}</FieldError>
                </div>
                <div>
                  <FieldLabel>Số lượng khách</FieldLabel>
                  <Input name="guestCount" type="number" defaultValue={selectedBooking?.guestCount || 1} required onChange={clearFieldError("guestCount")} invalid={hasError("guestCount")} />
                  <FieldError>{fieldErrors.guestCount}</FieldError>
                </div>
                <div>
                  <FieldLabel>Khu vực</FieldLabel>
                  <Select name="zoneSlug" defaultValue={zones.find((z) => z.name === selectedBooking?.zoneName)?.slug || "all"} onChange={clearFieldError("zoneSlug")} invalid={hasError("zoneSlug")}>
                    <option value="all">Chưa gán khu</option>
                    {zones.map((zone) => (
                      <option key={zone.id} value={zone.slug}>{zone.name}</option>
                    ))}
                  </Select>
                  <FieldError>{fieldErrors.zoneSlug}</FieldError>
                </div>
                <div>
                  <FieldLabel>Bàn cụ thể</FieldLabel>
                  <Input name="tableCode" defaultValue={selectedBooking?.tableCode || ""} placeholder="Ví dụ: A-01" onChange={clearFieldError("tableCode")} invalid={hasError("tableCode")} />
                  <FieldError>{fieldErrors.tableCode}</FieldError>
                </div>
              </div>

              <div>
                <FieldLabel>Ghi chú nội bộ</FieldLabel>
                <Textarea name="note" defaultValue={selectedBooking?.note || ""} placeholder="Yêu cầu đặc biệt của khách..." onChange={clearFieldError("note")} invalid={hasError("note")} />
                <FieldError>{fieldErrors.note}</FieldError>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={handleBookingModalClose}>Hủy</Button>
                <Button type="submit" disabled={isPending}>
                  <Save className="h-4 w-4" />
                  {selectedBooking ? "Lưu thay đổi" : "Tạo booking"}
                </Button>
              </div>
            </form>
          )}
        </Modal>

        <Modal
          isOpen={isCancelConfirmOpen}
          onClose={() => setIsCancelConfirmOpen(false)}
          title="Xác nhận hủy booking"
          className="max-w-md"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-[18px] bg-red-50 p-4 text-red-700">
              <AlertTriangle className="h-6 w-6" />
              <p className="font-semibold">Xác nhận hủy booking này?</p>
            </div>
            <p className="text-sm leading-relaxed text-[var(--muted)]">
              Hành động này sẽ hủy yêu cầu đặt chỗ của khách. Bạn có chắc chắn muốn tiếp tục?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setIsCancelConfirmOpen(false)}>Bỏ qua</Button>
              <form
                action={async () => {
                  if (!cancelTargetId) return;

                  startTransition(async () => {
                    const formData = new FormData();
                    formData.append("id", String(cancelTargetId));
                    await deleteBookingAction(formData);
                    setIsCancelConfirmOpen(false);
                    setCancelTargetId(null);
                    router.refresh();
                  });
                }}
              >
                <Button
                  type="submit"
                  variant="danger"
                  disabled={isPending || !cancelTargetId}
                >
                  Xác nhận hủy
                </Button>
              </form>
            </div>
          </div>
        </Modal>
      </div>
    </>
  );
}
