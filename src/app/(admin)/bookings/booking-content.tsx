"use client";

import { useState, useTransition } from "react";
import { Download, Edit, Plus, Save, AlertTriangle, CheckCircle2, XCircle, Search, Calendar, Users } from "lucide-react";
import { useRouter } from "next/navigation";

import { saveBookingAction } from "@/app/(admin)/actions";
import { SectionHeading } from "@/components/admin/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FieldLabel, Input, Select, Textarea } from "@/components/ui/field";
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
};

function getBookingTone(status: string) {
  if (status === "pending") return "warning" as const;
  if (status === "seated") return "info" as const;
  if (status === "confirmed") return "success" as const;
  if (status === "cancelled") return "danger" as const;
  return "success" as const;
}

export function BookingContent({ initialData }: BookingContentProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { bookings, zones } = initialData;

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingItem | null>(null);
  
  // Confirm Cancel state
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState<number | null>(null);

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

  const handleStatusUpdate = async (id: number, status: string) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append("id", String(id));
      formData.append("status", status);
      
      // We need other fields if we're using saveBookingAction as is
      // In a real app, you'd have a specific updateStatusAction
      // For now, we'll assume saveBookingAction handles partial updates or we fetch full data
      // Actually, looking at actions.ts, it updates everything provided.
      // So we should probably pass existing values.
      const booking = bookings.find(b => b.id === id);
      if (booking) {
        formData.append("code", booking.code);
        formData.append("customerName", booking.customerName);
        formData.append("customerPhone", booking.customerPhone);
        formData.append("bookingDate", booking.bookingDate);
        formData.append("bookingTime", booking.bookingTime);
        formData.append("guestCount", String(booking.guestCount));
        formData.append("zoneSlug", zones.find(z => z.name === booking.zoneName)?.slug || "all");
        formData.append("tableCode", booking.tableCode || "");
        formData.append("note", booking.note || "");
      }

      await saveBookingAction(formData);
      setIsCancelConfirmOpen(false);
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      {/* Block 1: Bộ lọc & Thống kê */}
      <Card>
        <CardContent>
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            {/* Tổng hôm nay */}
            <div className="rounded-2xl border border-[var(--line)] bg-[rgba(63,111,66,0.04)] p-4 text-center shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">Tổng hôm nay</div>
              <div className="mt-1 text-3xl font-bold tracking-tight text-[var(--forest-dark)]">{bookings.length}</div>
            </div>

            {/* Chờ xác nhận - Muted Amber */}
            <div className="rounded-2xl border border-[rgba(180,140,40,0.1)] bg-[rgba(180,140,40,0.06)] p-4 text-center shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#a5842e]">Chờ xác nhận</div>
              <div className="mt-1 text-3xl font-bold tracking-tight text-[#8c6d1f]">
                {bookings.filter(b => b.status === "pending").length}
              </div>
            </div>

            {/* Đã check-in - Muted Sky */}
            <div className="rounded-2xl border border-[rgba(59,130,246,0.1)] bg-[rgba(59,130,246,0.06)] p-4 text-center shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#567bb3]">Đã check-in</div>
              <div className="mt-1 text-3xl font-bold tracking-tight text-[#3e5f8a]">
                {bookings.filter(b => b.status === "seated").length}
              </div>
            </div>

            {/* Hoàn thành - Muted Forest */}
            <div className="rounded-2xl border border-[rgba(63,111,66,0.15)] bg-[rgba(63,111,66,0.1)] p-4 text-center shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--forest)]">Hoàn thành</div>
              <div className="mt-1 text-3xl font-bold tracking-tight text-[var(--forest-dark)]">
                {bookings.filter(b => b.status === "completed").length}
              </div>
            </div>
          </div>

          <SectionHeading title="Bộ lọc nâng cao" description="Lọc theo ngày, trạng thái và khu vực để quản lý luồng khách hiệu quả." />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <FieldLabel>Từ khóa</FieldLabel>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                <Input className="pl-10" placeholder="Tên khách / số điện thoại" />
              </div>
            </div>
            <div>
              <FieldLabel>Ngày</FieldLabel>
              <Input type="date" defaultValue="2026-04-22" />
            </div>
            <div>
              <FieldLabel>Trạng thái</FieldLabel>
              <Select defaultValue="all">
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
              <Select defaultValue="all">
                <option value="all">Tất cả khu vực</option>
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.slug}>{zone.name}</option>
                ))}
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Block 2: Danh sách Booking chính */}
      <Card>
        <CardContent>
          <SectionHeading 
            title="Danh sách Booking" 
            description="Quản lý chi tiết từng booking, gán bàn và theo dõi trạng thái phục vụ." 
            actions={
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
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
                {bookings.map((booking) => (
                  <tr key={booking.id} className="border-b border-[color:rgba(63,111,66,0.08)] last:border-0 hover:bg-white/40">
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
                      {booking.zoneName ?? "Chưa gán khu"} / <span className="font-semibold text-[var(--forest-dark)]">{booking.tableCode ?? "Chưa gán bàn"}</span>
                    </td>
                    <td className="py-4">
                      <Badge tone={getBookingTone(booking.status)}>
                        {booking.status}
                      </Badge>
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {booking.status === "pending" && (
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

      {/* Modal Thêm/Sửa Booking */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedBooking ? "Chi tiết Booking" : "Thêm Booking mới"}
      >
        <form 
          action={async (formData) => {
            startTransition(async () => {
              await saveBookingAction(formData);
              setIsModalOpen(false);
              router.refresh();
            });
          }} 
          className="space-y-4"
        >
          {selectedBooking && <input type="hidden" name="id" value={selectedBooking.id} />}
          
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <FieldLabel>Mã booking</FieldLabel>
              <Input name="code" defaultValue={selectedBooking?.code} placeholder="Để trống để tự tạo" />
            </div>
            <div>
              <FieldLabel>Trạng thái</FieldLabel>
              <Select name="status" defaultValue={selectedBooking?.status || "pending"}>
                <option value="pending">Chờ xác nhận</option>
                <option value="confirmed">Đã xác nhận</option>
                <option value="seated">Đã check-in</option>
                <option value="completed">Hoàn thành</option>
                <option value="cancelled">Đã huỷ</option>
                <option value="no_show">No-show</option>
              </Select>
            </div>
            <div>
              <FieldLabel>Tên khách hàng</FieldLabel>
              <Input name="customerName" defaultValue={selectedBooking?.customerName} required />
            </div>
            <div>
              <FieldLabel>Số điện thoại</FieldLabel>
              <Input name="customerPhone" defaultValue={selectedBooking?.customerPhone} required />
            </div>
            <div>
              <FieldLabel>Ngày đặt</FieldLabel>
              <Input name="bookingDate" type="date" defaultValue={selectedBooking?.bookingDate} required />
            </div>
            <div>
              <FieldLabel>Giờ đặt</FieldLabel>
              <Input name="bookingTime" type="time" defaultValue={selectedBooking?.bookingTime} required />
            </div>
            <div>
              <FieldLabel>Số lượng khách</FieldLabel>
              <Input name="guestCount" type="number" defaultValue={selectedBooking?.guestCount || 1} required />
            </div>
            <div>
              <FieldLabel>Khu vực</FieldLabel>
              <Select name="zoneSlug" defaultValue={zones.find(z => z.name === selectedBooking?.zoneName)?.slug || "all"}>
                <option value="all">Chưa gán khu</option>
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.slug}>{zone.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <FieldLabel>Bàn cụ thể</FieldLabel>
              <Input name="tableCode" defaultValue={selectedBooking?.tableCode || ""} placeholder="Ví dụ: A-01" />
            </div>
          </div>

          <div>
            <FieldLabel>Ghi chú nội bộ</FieldLabel>
            <Textarea name="note" defaultValue={selectedBooking?.note || ""} placeholder="Yêu cầu đặc biệt của khách..." />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button type="submit" disabled={isPending}>
              <Save className="h-4 w-4" />
              {selectedBooking ? "Lưu thay đổi" : "Tạo booking"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Xác nhận Hủy */}
      <Modal
        isOpen={isCancelConfirmOpen}
        onClose={() => setIsCancelConfirmOpen(false)}
        title="Xác nhận hủy booking"
        className="max-w-md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-[18px] bg-red-50 p-4 text-red-700">
            <AlertTriangle className="h-6 w-6" />
            <p className="font-semibold">Bạn có chắc chắn muốn hủy booking này?</p>
          </div>
          <p className="text-sm leading-relaxed text-[var(--muted)]">
            Hành động này sẽ hủy yêu cầu đặt chỗ của khách. Bạn có chắc chắn muốn tiếp tục?
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setIsCancelConfirmOpen(false)}>Bỏ qua</Button>
            <Button 
              variant="danger" 
              onClick={() => cancelTargetId && handleStatusUpdate(cancelTargetId, "cancelled")}
              disabled={isPending}
            >
              Xác nhận hủy
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
