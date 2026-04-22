"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { CalendarRange, Download, Filter } from "lucide-react";

import { AdminShell } from "@/components/admin/admin-shell";
import { SectionHeading } from "@/components/admin/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FieldLabel, Select } from "@/components/ui/field";
import { bookingRows } from "@/data/mock-data";

const events = bookingRows.map((booking) => ({
  id: booking.id,
  title: `${booking.guest} · ${booking.table}`,
  start: `${booking.date}T${booking.time}:00`,
  end: `${booking.date}T${booking.time === "20:00" ? "21:30" : booking.time === "19:00" ? "20:30" : "20:00"}:00`,
  extendedProps: booking,
}));

export default function CalendarPage() {
  return (
    <AdminShell
      pathname="/calendar"
      title="Calendar booking"
      description="Xem lịch ngày / tuần / tháng, lọc theo khu vực và chuẩn bị nền cho drag-drop reschedule trong bản fullstack production."
      actions={
        <>
          <Button variant="outline">
            <Download className="h-4 w-4" />
            Xuất tuần này
          </Button>
          <Button>
            <CalendarRange className="h-4 w-4" />
            Tạo lịch mới
          </Button>
        </>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_360px]">
        <Card>
          <CardContent>
            <SectionHeading title="Lịch điều phối" description="Calendar hiện tại dùng dữ liệu mock; bước tiếp theo sẽ nối DB + drag-drop persist + realtime sync." />
            <div className="mb-4 grid gap-3 md:grid-cols-3">
              <div>
                <FieldLabel>Khu vực</FieldLabel>
                <Select defaultValue="all">
                  <option value="all">Tất cả khu vực</option>
                  <option value="deck-a">BBQ Deck A</option>
                  <option value="deck-b">BBQ Deck B</option>
                  <option value="cafe">Cafe Garden</option>
                </Select>
              </div>
              <div>
                <FieldLabel>Trạng thái</FieldLabel>
                <Select defaultValue="all">
                  <option value="all">Tất cả</option>
                  <option value="pending">Chờ xác nhận</option>
                  <option value="confirmed">Đã xác nhận</option>
                  <option value="seated">Đã check-in</option>
                </Select>
              </div>
              <div className="flex items-end">
                <Button variant="secondary" className="w-full">
                  <Filter className="h-4 w-4" />
                  Áp dụng lọc
                </Button>
              </div>
            </div>
            <div className="overflow-hidden rounded-[24px] border border-[color:var(--line)] bg-white/75 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
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
                  --fc-event-bg-color: #6e9565;
                  --fc-event-border-color: #6e9565;
                  --fc-event-text-color: #f8fff5;
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
                }
              `}</style>
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="timeGridWeek"
                headerToolbar={{
                  left: "prev,next today",
                  center: "title",
                  right: "dayGridMonth,timeGridWeek,timeGridDay",
                }}
                editable
                selectable
                height="auto"
                events={events}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit xl:sticky xl:top-6">
          <CardContent>
            <SectionHeading title="Chi tiết / staffing note" description="Khối này dùng để review booking khi click vào event hoặc cân đối nhân sự theo ngày bận." />
            <div className="space-y-4 text-sm">
              <div className="rounded-[18px] bg-white/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold text-[var(--forest-dark)]">BBQ Deck A · 21/04</div>
                  <Badge tone="warning">Peak 18:00–20:30</Badge>
                </div>
                <p className="mt-2 leading-6 text-[var(--muted)]">Khuyến nghị tăng thêm 2 nhân viên phục vụ, 1 nhân viên bếp cho khung tối.</p>
              </div>
              {bookingRows.map((booking) => (
                <div key={booking.id} className="rounded-[18px] border border-[color:var(--line)] bg-white/60 p-4">
                  <div className="font-semibold text-[var(--forest-dark)]">{booking.guest}</div>
                  <div className="mt-1 text-[var(--muted)]">{booking.date} · {booking.time} · {booking.zone} / {booking.table}</div>
                  <p className="mt-2 leading-6 text-[var(--muted)]">{booking.note}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
