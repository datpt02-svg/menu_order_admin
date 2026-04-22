import { Download, Filter, Plus } from "lucide-react";

import { saveBookingAction } from "@/app/(admin)/actions";
import { AdminShell } from "@/components/admin/admin-shell";
import { SectionHeading } from "@/components/admin/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FieldLabel, Input, Select, Textarea } from "@/components/ui/field";
import { safeBookings, safeZones } from "@/lib/server/safe-data";

function getBookingTone(status: string) {
  if (status === "pending") return "warning" as const;
  if (status === "seated") return "info" as const;
  return "success" as const;
}

export default async function BookingsPage() {
  const [{ data: bookingRows }, { data: zones }] = await Promise.all([safeBookings(), safeZones()]);
  const selected = bookingRows[0] ?? null;

  return (
    <AdminShell
      pathname="/bookings"
      title="Quản lý booking"
      description="Theo dõi danh sách booking, lọc theo trạng thái/thời gian và xử lý chi tiết từng khách ngay trong một màn hình desktop-first."
      actions={
        <>
          <Button variant="outline">
            <Download className="h-4 w-4" />
            Xuất Excel
          </Button>
          <Button>
            <Plus className="h-4 w-4" />
            Thêm booking
          </Button>
        </>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_420px]">
        <div className="space-y-4">
          <Card>
            <CardContent>
              <SectionHeading title="Bộ lọc nhanh" description="Bản đầu ưu tiên thao tác nhanh theo ngày, trạng thái, khu vực và từ khóa tên/số điện thoại." />
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <FieldLabel>Từ khóa</FieldLabel>
                  <Input placeholder="Tên khách / số điện thoại" />
                </div>
                <div>
                  <FieldLabel>Ngày</FieldLabel>
                  <Input type="date" defaultValue="2026-04-21" />
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
              <div className="mt-4 flex flex-wrap gap-3">
                <Button variant="secondary">
                  <Filter className="h-4 w-4" />
                  Áp dụng bộ lọc
                </Button>
                <Button variant="ghost">Reset</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <SectionHeading title="Danh sách booking" description="Thiết kế dùng được cho cả chuột và trackpad, phù hợp thao tác nội bộ tại quán." />
              <div className="overflow-x-auto admin-scrollbar">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-[color:var(--line)] text-left text-[var(--muted)]">
                      <th className="pb-3 font-semibold">Mã</th>
                      <th className="pb-3 font-semibold">Khách</th>
                      <th className="pb-3 font-semibold">Số khách</th>
                      <th className="pb-3 font-semibold">Ngày giờ</th>
                      <th className="pb-3 font-semibold">Khu vực</th>
                      <th className="pb-3 font-semibold">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookingRows.map((booking) => (
                      <tr key={booking.id} className="border-b border-[color:rgba(63,111,66,0.08)] last:border-0 hover:bg-white/40">
                        <td className="py-4 pr-4 font-semibold text-[var(--forest-dark)]">{booking.code}</td>
                        <td className="py-4 pr-4">
                          <div className="font-semibold text-[var(--forest-dark)]">{booking.customerName}</div>
                          <div className="text-[var(--muted)]">{booking.customerPhone}</div>
                        </td>
                        <td className="py-4 pr-4 text-[var(--forest)]">{booking.guestCount}</td>
                        <td className="py-4 pr-4 text-[var(--muted)]">{booking.bookingDate} · {booking.bookingTime}</td>
                        <td className="py-4 pr-4 text-[var(--muted)]">{booking.zoneName ?? "Chưa gán khu"} / {booking.tableCode ?? "Chưa gán bàn"}</td>
                        <td className="py-4">
                          <Badge tone={getBookingTone(booking.status)}>
                            {booking.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit xl:sticky xl:top-6">
          <CardContent>
            <SectionHeading title="Chi tiết booking" description="Panel này là nơi xử lý nhanh đổi giờ, gán bàn và ghi chú nội bộ." />
            {selected ? (
              <form action={saveBookingAction} className="space-y-4">
                <input type="hidden" name="id" value={selected.id} />
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                  <div>
                    <FieldLabel>Mã booking</FieldLabel>
                    <Input name="code" defaultValue={selected.code} />
                  </div>
                  <div>
                    <FieldLabel>Trạng thái</FieldLabel>
                    <Select name="status" defaultValue={selected.status}>
                      <option value="pending">Chờ xác nhận</option>
                      <option value="confirmed">Đã xác nhận</option>
                      <option value="seated">Đã check-in</option>
                      <option value="completed">Hoàn thành</option>
                      <option value="cancelled">Đã huỷ</option>
                      <option value="no_show">No-show</option>
                    </Select>
                  </div>
                  <div>
                    <FieldLabel>Tên khách</FieldLabel>
                    <Input name="customerName" defaultValue={selected.customerName} />
                  </div>
                  <div>
                    <FieldLabel>Số điện thoại</FieldLabel>
                    <Input name="customerPhone" defaultValue={selected.customerPhone} />
                  </div>
                  <div>
                    <FieldLabel>Ngày</FieldLabel>
                    <Input name="bookingDate" type="date" defaultValue={selected.bookingDate} />
                  </div>
                  <div>
                    <FieldLabel>Giờ</FieldLabel>
                    <Input name="bookingTime" type="time" defaultValue={selected.bookingTime} />
                  </div>
                  <div>
                    <FieldLabel>Số khách</FieldLabel>
                    <Input name="guestCount" type="number" defaultValue={selected.guestCount} />
                  </div>
                  <div>
                    <FieldLabel>Khu vực</FieldLabel>
                    <Select name="zoneSlug" defaultValue={zones.find((zone) => zone.name === selected.zoneName)?.slug ?? "all"}>
                      <option value="all">Chưa gán khu</option>
                      {zones.map((zone) => (
                        <option key={zone.id} value={zone.slug}>{zone.name}</option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <FieldLabel>Bàn</FieldLabel>
                    <Input name="tableCode" defaultValue={selected.tableCode ?? ""} placeholder="A-03" />
                  </div>
                </div>
                <div>
                  <FieldLabel>Ghi chú nội bộ</FieldLabel>
                  <Textarea name="note" defaultValue={selected.note ?? ""} />
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button type="submit">Lưu thay đổi</Button>
                  <Button type="submit" variant="secondary" name="status" value="confirmed">Xác nhận booking</Button>
                  <Button type="submit" variant="danger" name="status" value="cancelled">Huỷ booking</Button>
                </div>
              </form>
            ) : (
              <div className="rounded-[18px] bg-white/60 p-4 text-sm text-[var(--muted)]">
                Chưa có booking nào để hiển thị chi tiết.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
