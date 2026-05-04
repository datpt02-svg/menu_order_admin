import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import { ArrowUpRight, Download, Sparkles } from "lucide-react";

import { AdminShell } from "@/components/admin/admin-shell";
import { RecentBookings } from "@/components/admin/recent-bookings";
import { SectionHeading } from "@/components/admin/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { safeDashboardSnapshot, safeZones } from "@/lib/server/safe-data";
import { getTodayDateString } from "@/lib/utils";

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
  noStore();
  const [snapshot, { data: zones }] = await Promise.all([
    safeDashboardSnapshot(),
    safeZones(),
  ]);
  const summaryCards = [
    {
      title: "Booking hôm nay",
      value: snapshot.stats.bookingsToday.toString(),
      change: `${snapshot.bookingList.length} booking toàn hệ thống`,
      hint: "Đếm từ dữ liệu lịch hiện tại trong DB.",
      href: "/bookings",
    },
    {
      title: "Yêu cầu đang mở",
      value: snapshot.stats.waiterOpen.toString(),
      change: `${snapshot.waiterList.length} yêu cầu gần nhất`,
      hint: "Ưu tiên các bàn còn trạng thái new hoặc in_progress để điều phối phục vụ.",
      href: "/waiter-requests",
    },
    {
      title: "Bàn đang bận",
      value: snapshot.stats.occupiedTables.toString(),
      change: `${snapshot.tableList.length} bàn trong sơ đồ`,
      hint: "Kết hợp với calendar để nhìn nhanh mật độ lấp đầy theo khung giờ.",
      href: "/tables",
    },
    {
      title: "Tổng booking gần đây",
      value: snapshot.bookingList.length.toString(),
      change: `${snapshot.timeline.length} mốc sắp đến giờ`,
      hint: "Dùng chỉ số này để nhìn nhanh lượng việc đang chờ xử lý trong ngày và ca kế tiếp.",
      href: "/bookings",
    },
  ];
  const today = getTodayDateString();
  const todaysBookings = snapshot.bookingList.filter(b => b.bookingDate === today);
  const waiterFeed = snapshot.waiterList.slice(0, 4);
  return (
    <AdminShell
      pathname="/dashboard"
      title="Tổng quan vận hành"
      description="Theo dõi booking, waiter requests và bàn/khu vực trong cùng một giao diện quản trị."
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(340px,0.7fr)]">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
            {summaryCards.map((card) => (
              <Link key={card.title} href={card.href} className="group">
                <Card className="h-full cursor-pointer transition-all duration-200 hover:-translate-y-[2px] hover:shadow-[0_12px_24px_rgba(45,82,44,0.12)]">
                  <CardContent>
                    <div className="text-sm font-semibold text-[var(--muted)]">{card.title}</div>
                    <div className="mt-3 flex items-end justify-between gap-4">
                      <div>
                        <div className="text-3xl font-extrabold text-[var(--forest-dark)]">{card.value}</div>
                        <div className="mt-2 text-sm font-semibold text-[var(--forest)]">{card.change}</div>
                      </div>
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/70 text-[var(--forest)] shadow-[0_8px_18px_rgba(45,82,44,0.08)] transition-all duration-200 group-hover:shadow-[0_12px_22px_rgba(45,82,44,0.12)]">
                        <ArrowUpRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-[1px] group-hover:-translate-y-[1px]" />
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{card.hint}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <Card>
            <CardContent>
              <SectionHeading
                title="Booking sắp đến giờ"
                description="Mốc booking gần nhất theo dữ liệu hiện có trong hệ thống."
              />
              <div className="space-y-3">
                {snapshot.timeline.length > 0 ? snapshot.timeline.map((item) => (
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
                    <Link
                      href={`/bookings?bookingId=${item.bookingId}`}
                      className="inline-flex items-center rounded-[var(--radius-pill)] font-semibold transition-all duration-200 enabled:cursor-pointer enabled:hover:-translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(110,149,101,0.28)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:cursor-not-allowed disabled:opacity-60 bg-transparent text-[var(--forest)] hover:bg-white/45 hover:shadow-[0_10px_18px_rgba(45,82,44,0.1)] min-h-11 px-4 text-sm gap-2 justify-start md:justify-center"
                    >
                      Mở chi tiết
                    </Link>
                  </div>
                )) : (
                  <div className="rounded-[18px] border border-[color:var(--line)] bg-white/60 p-4 text-sm text-[var(--muted)]">
                    Chưa có booking nào sắp đến giờ.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <RecentBookings bookings={todaysBookings} zones={zones} />
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent>
              <SectionHeading
                title="Yêu cầu phục vụ gần đây"
                description="Các yêu cầu phục vụ mới nhất đang có trong hệ thống."
              />
              <div className="space-y-3">
                {waiterFeed.length > 0 ? waiterFeed.map((request) => (
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
                )) : (
                  <div className="rounded-[18px] border border-[color:var(--line)] bg-white/60 p-4 text-sm text-[var(--muted)]">
                    Chưa có yêu cầu phục vụ nào.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <SectionHeading
                title="Tín hiệu điều phối"
                description="Tóm tắt nhanh để nhìn tình trạng vận hành hiện tại."
              />
              <div className="space-y-3 text-sm text-[var(--muted)]">
                <div className="rounded-[18px] bg-white/60 p-4">
                  <div className="font-semibold text-[var(--forest-dark)]">Booking hôm nay</div>
                  <p className="mt-2 leading-6">{todaysBookings.length > 0 ? `${todaysBookings.length} booking trong ngày đang cần theo dõi.` : "Chưa có booking nào trong ngày."}</p>
                </div>
                <div className="rounded-[18px] bg-white/60 p-4">
                  <div className="font-semibold text-[var(--forest-dark)]">Yêu cầu phục vụ</div>
                  <p className="mt-2 leading-6">{waiterFeed.length > 0 ? `${waiterFeed.length} yêu cầu gần đây đang hiển thị trên dashboard.` : "Chưa có yêu cầu phục vụ nào."}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminShell>
  );
}
