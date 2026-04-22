import { ArrowUpRight, Download, Sparkles } from "lucide-react";

import { AdminShell } from "@/components/admin/admin-shell";
import { SectionHeading } from "@/components/admin/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { safeDashboardSnapshot } from "@/lib/server/safe-data";

function getBookingTone(status: string) {
  if (status === "pending") return "warning" as const;
  if (status === "seated") return "info" as const;
  return "success" as const;
}

function getWaiterTone(status: string) {
  if (status === "new") return "danger" as const;
  if (status === "in_progress") return "warning" as const;
  return "success" as const;
}

export default async function DashboardPage() {
  const snapshot = await safeDashboardSnapshot();
  const summaryCards = [
    {
      title: "Booking hôm nay",
      value: snapshot.stats.bookingsToday.toString(),
      change: `${snapshot.bookingList.length} booking toàn hệ thống`,
      hint: "Đếm từ dữ liệu lịch hiện tại và tự fallback nếu PostgreSQL chưa sẵn sàng.",
    },
    {
      title: "Yêu cầu đang mở",
      value: snapshot.stats.waiterOpen.toString(),
      change: `${snapshot.waiterList.length} yêu cầu gần nhất`,
      hint: "Ưu tiên các bàn còn trạng thái new hoặc in_progress để điều phối phục vụ.",
    },
    {
      title: "Bàn đang bận",
      value: snapshot.stats.occupiedTables.toString(),
      change: `${snapshot.tableList.length} bàn trong sơ đồ`,
      hint: "Kết hợp với calendar để nhìn nhanh mật độ lấp đầy theo khung giờ.",
    },
    {
      title: "Tổng booking gần đây",
      value: snapshot.bookingList.length.toString(),
      change: `${snapshot.timeline.length} mốc sắp đến giờ`,
      hint: "Dùng chỉ số này để nhìn nhanh lượng việc đang chờ xử lý trong ngày và ca kế tiếp.",
    },
  ];
  const recentBookings = snapshot.bookingList.slice(0, 5);
  const waiterFeed = snapshot.waiterList.slice(0, 4);
  return (
    <AdminShell
      pathname="/dashboard"
      title="Tổng quan vận hành"
      description="Theo dõi booking, waiter requests và bàn/khu vực trong cùng một giao diện đồng bộ thương hiệu."
      actions={
        <>
          <Button variant="outline">
            <Download className="h-4 w-4" />
            Xuất snapshot hôm nay
          </Button>
          <Button>
            <Sparkles className="h-4 w-4" />
            Tạo booking mới
          </Button>
        </>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(340px,0.7fr)]">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
            {summaryCards.map((card) => (
              <Card key={card.title}>
                <CardContent>
                  <div className="text-sm font-semibold text-[var(--muted)]">{card.title}</div>
                  <div className="mt-3 flex items-end justify-between gap-4">
                    <div>
                      <div className="text-3xl font-extrabold text-[var(--forest-dark)]">{card.value}</div>
                      <div className="mt-2 text-sm font-semibold text-[var(--forest)]">{card.change}</div>
                    </div>
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/70 text-[var(--forest)] shadow-[0_8px_18px_rgba(45,82,44,0.08)]">
                      <ArrowUpRight className="h-5 w-5" />
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{card.hint}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardContent>
              <SectionHeading
                title="Booking sắp đến giờ"
                description="Dùng khối này để chủ quán nhìn nhanh flow tối nay trước khi qua calendar tuần hoặc export Excel."
              />
              <div className="space-y-3">
                {snapshot.timeline.map((item) => (
                  <div key={`${item.time}-${item.title}`} className="flex flex-col gap-3 rounded-[18px] border border-[color:var(--line)] bg-white/60 p-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="min-w-20 rounded-full bg-[var(--mint-strong)] px-3 py-2 text-center text-sm font-bold text-[var(--forest-dark)]">
                        {item.time}
                      </div>
                      <div>
                        <div className="font-semibold text-[var(--forest-dark)]">{item.title}</div>
                        <div className="mt-1 text-sm text-[var(--muted)]">{item.detail}</div>
                      </div>
                    </div>
                    <Button variant="ghost" className="justify-start md:justify-center">Mở chi tiết</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <SectionHeading
                title="Booking gần nhất"
                description="Danh sách mẫu để review nhanh trạng thái trước khi vào module booking đầy đủ."
              />
              <div className="overflow-x-auto admin-scrollbar">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-[color:var(--line)] text-left text-[var(--muted)]">
                      <th className="pb-3 font-semibold">Mã</th>
                      <th className="pb-3 font-semibold">Khách</th>
                      <th className="pb-3 font-semibold">Giờ</th>
                      <th className="pb-3 font-semibold">Bàn</th>
                      <th className="pb-3 font-semibold">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentBookings.map((booking) => (
                      <tr key={booking.id} className="border-b border-[color:rgba(63,111,66,0.08)] last:border-0">
                        <td className="py-3 pr-4 font-semibold text-[var(--forest-dark)]">{booking.code}</td>
                        <td className="py-3 pr-4">
                          <div className="font-semibold text-[var(--forest-dark)]">{booking.customerName}</div>
                          <div className="text-[var(--muted)]">{booking.customerPhone}</div>
                        </td>
                        <td className="py-3 pr-4 text-[var(--forest)]">{booking.bookingDate} · {booking.bookingTime}</td>
                        <td className="py-3 pr-4 text-[var(--muted)]">{booking.zoneName ?? "Chưa gán khu"} / {booking.tableCode ?? "Chưa gán bàn"}</td>
                        <td className="py-3">
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

        <div className="space-y-4">
          <Card>
            <CardContent>
              <SectionHeading
                title="Realtime waiter feed"
                description="Mô phỏng feed nhận yêu cầu phục vụ theo thời gian thực."
              />
              <div className="space-y-3">
                {waiterFeed.map((request) => (
                  <div key={request.code} className="rounded-[18px] border border-[color:var(--line)] bg-white/60 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold text-[var(--forest-dark)]">{request.tableCode ?? "Chưa gán bàn"} · {request.zoneName ?? "Chưa gán khu"}</div>
                      <Badge tone={getWaiterTone(request.status)}>
                        {request.status}
                      </Badge>
                    </div>
                    <div className="mt-2 text-sm font-semibold text-[var(--forest)]">{request.need}</div>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{request.note}</p>
                    <div className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--mint-deep)]">{new Date(request.createdAt).toLocaleString("vi-VN")}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <SectionHeading
                title="Tín hiệu điều phối"
                description="Dùng để hỗ trợ quyết định tăng ca khi calendar tuần có dấu hiệu quá tải."
              />
              <div className="space-y-3 text-sm text-[var(--muted)]">
                <div className="rounded-[18px] bg-white/60 p-4">
                  <div className="font-semibold text-[var(--forest-dark)]">Thứ 7 tuần tới</div>
                  <p className="mt-2 leading-6">Đã có 31 booking, tập trung 18:00–20:30. Nên chuẩn bị thêm 2 nhân viên phục vụ và 1 nhân viên bếp.</p>
                </div>
                <div className="rounded-[18px] bg-white/60 p-4">
                  <div className="font-semibold text-[var(--forest-dark)]">Khung giờ cao điểm</div>
                  <p className="mt-2 leading-6">Các booking buổi tối đang dồn mạnh vào cuối tuần. Ưu tiên rà soát bàn trống và xác nhận sớm các booking pending.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminShell>
  );
}
