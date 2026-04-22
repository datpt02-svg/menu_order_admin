import { MapPinned, Sparkles } from "lucide-react";

import { AdminShell } from "@/components/admin/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { tableStatus } from "@/data/mock-data";

const toneMap = {
  available: "success",
  reserved: "warning",
  occupied: "info",
  cleaning: "default",
} as const;

export default function TablesPage() {
  return (
    <AdminShell
      pathname="/tables"
      title="Bàn / Khu vực"
      description="Theo dõi công suất bàn, tình trạng đặt trước và các điểm cần chú ý trong từng zone của quán."
      actions={
        <>
          <Button variant="outline">
            <MapPinned className="h-4 w-4" />
            Chuyển chế độ sơ đồ
          </Button>
          <Button>
            <Sparkles className="h-4 w-4" />
            Thêm bàn mới
          </Button>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {tableStatus.map((table) => (
          <Card key={table.id}>
            <CardContent>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-[family:var(--font-coiny)] text-lg text-[var(--forest-dark)]">{table.id}</div>
                  <div className="mt-1 text-sm text-[var(--muted)]">{table.zone}</div>
                </div>
                <Badge tone={toneMap[table.status]}>{table.status}</Badge>
              </div>
              <div className="mt-4 grid gap-3 rounded-[18px] bg-white/60 p-4 text-sm text-[var(--muted)]">
                <div className="flex items-center justify-between gap-3">
                  <span>Sức chứa</span>
                  <span className="font-semibold text-[var(--forest-dark)]">{table.seats} khách</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Booking gắn bàn</span>
                  <span className="font-semibold text-[var(--forest-dark)]">{table.status === "reserved" ? "1 booking" : "—"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Yêu cầu phục vụ</span>
                  <span className="font-semibold text-[var(--forest-dark)]">{table.id === "A-03" ? "1 đang chờ" : "Không có"}</span>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="secondary" className="min-h-10 px-3">Cập nhật trạng thái</Button>
                <Button variant="ghost" className="min-h-10 px-3">Gán booking</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminShell>
  );
}
