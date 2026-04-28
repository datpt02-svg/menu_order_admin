import { Check, Edit, Trash2 } from "lucide-react";
import { useEffect, useRef } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const toneMap = {
  available: "success",
  reserved: "warning",
  occupied: "info",
  cleaning: "default",
} as const;

export type TableStatusItem = {
  id: number;
  code: string;
  zoneId: number | null;
  zone: string;
  status: keyof typeof toneMap;
  seats: number;
  createdAt?: Date;
  layout: {
    x: number;
    y: number;
    width: number;
    height: number;
    shape: "round" | "rect";
  };
};

export function TableStatusCard({
  table,
  statusOptions,
  isStatusPending,
  onEdit,
  onDelete,
  onUpdateStatus,
}: {
  table: TableStatusItem;
  statusOptions: ReadonlyArray<{ value: TableStatusItem["status"]; label: string }>;
  isStatusPending: boolean;
  onEdit: (table: TableStatusItem) => void;
  onDelete: (table: TableStatusItem) => void;
  onUpdateStatus: (table: TableStatusItem, status: TableStatusItem["status"]) => void;
}) {
  const detailsRef = useRef<HTMLDetailsElement | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const details = detailsRef.current;
      if (!details?.open) return;
      if (event.target instanceof Node && details.contains(event.target)) return;
      details.open = false;
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  return (
    <Card>
      <CardContent>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-[family:var(--font-coiny)] text-lg text-[var(--forest-dark)]">{table.code}</div>
            <div className="mt-1 text-sm text-[var(--muted)]">{table.zone}</div>
          </div>
          <details ref={detailsRef} className="group relative shrink-0">
            <summary className="list-none marker:hidden [&::-webkit-details-marker]:hidden">
              <Badge
                tone={toneMap[table.status]}
                className={cn(
                  "cursor-pointer transition-opacity duration-200 hover:opacity-90",
                  isStatusPending && "pointer-events-none opacity-60",
                )}
              >
                {statusOptions.find((option) => option.value === table.status)?.label ?? table.status}
              </Badge>
            </summary>
            <div className="absolute right-0 top-[calc(100%+0.5rem)] z-20 hidden min-w-[180px] rounded-[20px] border border-[color:var(--line)] bg-[rgba(255,255,255,0.96)] p-2 shadow-[0_18px_36px_rgba(24,51,33,0.16)] backdrop-blur group-open:block">
              <div className="space-y-1">
                {statusOptions.map((option) => {
                  const isActive = option.value === table.status;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-[14px] px-3 py-2 text-left text-sm font-semibold text-[var(--forest-dark)] transition-colors duration-200",
                        isActive ? "bg-[rgba(63,111,66,0.10)] text-[var(--forest)]" : "hover:bg-[var(--panel)]",
                      )}
                      disabled={isStatusPending || isActive}
                      onClick={() => {
                        detailsRef.current?.removeAttribute("open");
                        onUpdateStatus(table, option.value);
                      }}
                    >
                      <span>{option.label}</span>
                      {isActive ? <Check className="h-4 w-4" /> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </details>
        </div>
        <div className="mt-4 grid gap-3 rounded-[18px] bg-white/60 p-4 text-sm text-[var(--muted)]">
          <div className="flex items-center justify-between gap-3">
            <span>Sức chứa</span>
            <span className="font-semibold text-[var(--forest-dark)]">{table.seats} khách</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span>Mã bàn</span>
            <span className="font-semibold text-[var(--forest-dark)]">{table.code}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span>Khu vực</span>
            <span className="font-semibold text-[var(--forest-dark)]">{table.zone}</span>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="ghost" className="min-h-10 px-3" onClick={() => onEdit(table)}>
            <Edit className="h-4 w-4" />
            Sửa bàn
          </Button>
          <Button variant="danger" className="min-h-10 px-3" onClick={() => onDelete(table)}>
            <Trash2 className="h-4 w-4" />
            Xóa bàn
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
