import { BellRing, CheckCheck, RefreshCcw } from "lucide-react";

import { AdminShell } from "@/components/admin/admin-shell";
import { SectionHeading } from "@/components/admin/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { waiterRequests } from "@/data/mock-data";

const columns = [
  { key: "new", title: "Mới" },
  { key: "in_progress", title: "Đang xử lý" },
  { key: "done", title: "Hoàn thành" },
] as const;

export default function WaiterRequestsPage() {
  return (
    <AdminShell
      pathname="/waiter-requests"
      title="Yêu cầu gọi nhân viên"
      description="Board realtime cho nhân viên phục vụ: nhìn nhanh bàn nào cần hỗ trợ, nội dung yêu cầu là gì và đang ở trạng thái nào."
      actions={
        <>
          <Button variant="outline">
            <RefreshCcw className="h-4 w-4" />
            Đồng bộ realtime
          </Button>
          <Button>
            <BellRing className="h-4 w-4" />
            Bật âm báo
          </Button>
        </>
      }
    >
      <div className="grid gap-4 xl:grid-cols-3">
        {columns.map((column) => (
          <Card key={column.key}>
            <CardContent>
              <SectionHeading title={column.title} description="Card view ưu tiên cho khu vận hành tại quán." />
              <div className="space-y-3">
                {waiterRequests
                  .filter((request) => request.status === column.key)
                  .map((request) => (
                    <article key={request.id} className="rounded-[18px] border border-[color:var(--line)] bg-white/65 p-4 shadow-[0_10px_20px_rgba(45,82,44,0.05)]">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold text-[var(--forest-dark)]">{request.table}</div>
                          <div className="text-sm text-[var(--muted)]">{request.zone}</div>
                        </div>
                        <Badge tone={request.status === "new" ? "danger" : request.status === "in_progress" ? "warning" : "success"}>
                          {request.status}
                        </Badge>
                      </div>
                      <div className="mt-3 text-sm font-semibold text-[var(--forest)]">{request.need}</div>
                      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{request.note}</p>
                      <div className="mt-4 flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--mint-deep)]">
                        <span>{request.id}</span>
                        <span>{request.createdAt}</span>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {request.status !== "done" ? <Button variant="secondary" className="min-h-10 px-3">Nhận xử lý</Button> : null}
                        <Button variant="ghost" className="min-h-10 px-3">
                          <CheckCheck className="h-4 w-4" />
                          Hoàn tất
                        </Button>
                      </div>
                    </article>
                  ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminShell>
  );
}
