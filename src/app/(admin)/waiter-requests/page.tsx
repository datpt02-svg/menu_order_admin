import { unstable_noStore as noStore } from "next/cache";
import { BellRing, CheckCheck, RefreshCcw } from "lucide-react";

import { cn } from "@/lib/utils";

import { saveWaiterRequestAction } from "@/app/(admin)/actions";
import { AdminShell } from "@/components/admin/admin-shell";
import { ClearHighlightQuery } from "@/components/admin/clear-highlight-query";
import { RealtimeSync } from "@/components/admin/realtime-sync";
import { SectionHeading } from "@/components/admin/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { safeWaiterRequests } from "@/lib/server/safe-data";

type PageSearchParams = Record<string, string | string[] | undefined>;

const columns = [
  { key: "new", title: "Mới" },
  { key: "in_progress", title: "Đang xử lý" },
  { key: "done", title: "Hoàn thành" },
] as const;

export default async function WaiterRequestsPage({
  searchParams,
}: {
  searchParams?: Promise<PageSearchParams>;
}) {
  noStore();
  const [{ data: waiterRequests }, resolvedSearchParams] = await Promise.all([
    safeWaiterRequests(),
    searchParams ?? Promise.resolve<PageSearchParams>({}),
  ]);
  const requestIdParam = resolvedSearchParams.requestId;
  const highlightedRequestId = Array.isArray(requestIdParam)
    ? Number(requestIdParam[0])
    : Number(requestIdParam);

  return (
    <AdminShell
      pathname="/waiter-requests"
      title="Yêu cầu gọi nhân viên"
      description="Board realtime cho nhân viên phục vụ: nhìn nhanh bàn nào cần hỗ trợ, nội dung yêu cầu là gì và đang ở trạng thái nào."
      actions={
        <>
          <Button>
            <BellRing className="h-4 w-4" />
            Bật âm báo
          </Button>
        </>
      }
    >
      <RealtimeSync events={["waiter-request:created", "waiter-request:updated"]} />
      <ClearHighlightQuery keys={["requestId"]} />
      <div className="grid gap-4 xl:grid-cols-3">
        {columns.map((column) => (
          <Card key={column.key}>
            <CardContent>
              <SectionHeading title={column.title} description="Card view ưu tiên cho khu vận hành tại quán." />
              <div className="space-y-3">
                {waiterRequests
                  .filter((request) => request.status === column.key)
                  .map((request) => (
                    <article
                      id={`request-${request.id}`}
                      key={request.id}
                      className={cn(
                        "rounded-[18px] border border-[color:var(--line)] bg-white/65 p-4 shadow-[0_10px_20px_rgba(45,82,44,0.05)] scroll-mt-24 transition",
                        highlightedRequestId === request.id && "border-[rgba(159,75,62,0.32)] bg-[rgba(159,75,62,0.12)] shadow-[0_14px_28px_rgba(159,75,62,0.12)]",
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold text-[var(--forest-dark)]">{request.tableCode ?? "Chưa gán bàn"}</div>
                          <div className="text-sm text-[var(--muted)]">{request.zoneName ?? "Chưa gán khu"}</div>
                        </div>
                        <Badge tone={request.status === "new" ? "danger" : request.status === "in_progress" ? "warning" : "success"}>
                          {request.status}
                        </Badge>
                      </div>
                      <div className="mt-3 text-sm font-semibold text-[var(--forest)]">{request.need}</div>
                      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{request.note}</p>
                      <div className="mt-4 flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--mint-deep)]">
                        <span>{request.code}</span>
                        <span>{new Date(request.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {request.status !== "done" ? (
                          <form action={saveWaiterRequestAction}>
                            <input type="hidden" name="id" value={request.id} />
                            <input type="hidden" name="code" value={request.code} />
                            <input type="hidden" name="zoneId" value={request.zoneId ?? ""} />
                            <input type="hidden" name="tableId" value={request.tableId ?? ""} />
                            <input type="hidden" name="tableCode" value={request.tableCode ?? ""} />
                            <input type="hidden" name="need" value={request.need} />
                            <input type="hidden" name="note" value={request.note ?? ""} />
                            <Button type="submit" variant="secondary" className="min-h-10 px-3" name="status" value="in_progress">Nhận xử lý</Button>
                          </form>
                        ) : null}
                        <form action={saveWaiterRequestAction}>
                          <input type="hidden" name="id" value={request.id} />
                          <input type="hidden" name="code" value={request.code} />
                          <input type="hidden" name="zoneId" value={request.zoneId ?? ""} />
                          <input type="hidden" name="tableId" value={request.tableId ?? ""} />
                          <input type="hidden" name="tableCode" value={request.tableCode ?? ""} />
                          <input type="hidden" name="need" value={request.need} />
                          <input type="hidden" name="note" value={request.note ?? ""} />
                          <Button type="submit" variant="ghost" className="min-h-10 px-3" name="status" value="done">
                            <CheckCheck className="h-4 w-4" />
                            Hoàn tất
                          </Button>
                        </form>
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
