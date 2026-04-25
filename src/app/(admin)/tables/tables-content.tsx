"use client";

import { MapPinned, Rows3 } from "lucide-react";
import { useMemo, useState } from "react";

import { TableStatusCard, type TableStatusItem } from "@/components/admin/table-status-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type TablesContentProps = {
  tables: readonly TableStatusItem[];
};

type ViewMode = "list" | "diagram";

const toneMap = {
  available: "success",
  reserved: "warning",
  occupied: "info",
  cleaning: "default",
} as const;

export function TablesContent({ tables }: TablesContentProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const zones = useMemo(() => {
    const grouped = new Map<string, TableStatusItem[]>();

    for (const table of tables) {
      const current = grouped.get(table.zone) ?? [];
      current.push(table);
      grouped.set(table.zone, current);
    }

    return Array.from(grouped.entries()).map(([zone, items]) => ({ zone, items }));
  }, [tables]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--mint-deep)]">Chế độ hiển thị</div>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {viewMode === "list"
              ? "Xem chi tiết từng bàn theo dạng thẻ."
              : "Xem vị trí bàn theo từng zone để điều phối nhanh hơn."}
          </p>
        </div>
        <Button
          variant="outline"
          aria-pressed={viewMode === "diagram"}
          onClick={() => setViewMode((current) => (current === "list" ? "diagram" : "list"))}
        >
          {viewMode === "list" ? <MapPinned className="h-4 w-4" /> : <Rows3 className="h-4 w-4" />}
          {viewMode === "list" ? "Chuyển sang sơ đồ" : "Chuyển sang danh sách"}
        </Button>
      </div>

      {viewMode === "list" ? (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {tables.map((table) => (
            <TableStatusCard key={table.id} table={table} />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {zones.map(({ zone, items }) => (
            <Card key={zone}>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-[family:var(--font-coiny)] text-lg text-[var(--forest-dark)]">{zone}</div>
                    <div className="mt-1 text-sm text-[var(--muted)]">{items.length} bàn trong sơ đồ</div>
                  </div>
                  <Badge tone="default">Sơ đồ zone</Badge>
                </div>
                <div className="relative min-h-[320px] overflow-hidden rounded-[24px] border border-dashed border-[color:var(--line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(232,244,227,0.7))] pt-14">
                  <div className="pointer-events-none absolute inset-x-5 top-4 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                    <span>Lối đi</span>
                    <span>{zone}</span>
                  </div>
                  {items.map((table) => (
                    <button
                      key={table.id}
                      type="button"
                      className={cn(
                        "absolute flex flex-col items-start justify-between border border-white/70 bg-white/90 px-4 py-3 text-left shadow-[0_12px_24px_rgba(45,82,44,0.12)] transition-transform duration-200 hover:-translate-y-0.5",
                        table.layout.shape === "round" ? "rounded-[999px]" : "rounded-[22px]",
                      )}
                      style={{
                        left: `${table.layout.x}px`,
                        top: `${table.layout.y + 48}px`,
                        width: `${table.layout.width}px`,
                        height: `${table.layout.height}px`,
                      }}
                    >
                      <span className="font-[family:var(--font-coiny)] text-base text-[var(--forest-dark)]">{table.id}</span>
                      <div className="space-y-1 text-xs text-[var(--muted)]">
                        <div>{table.seats} khách</div>
                        <Badge tone={toneMap[table.status]} className="min-h-0 px-2 py-1 text-[10px]">
                          {table.status}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
