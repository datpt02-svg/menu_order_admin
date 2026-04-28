"use client";

import { Edit, MapPinned, Plus, Rows3, Trash2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  deleteTableAction,
  deleteZoneAction,
  saveTableAction,
  saveZoneAction,
  updateTableStatusAction,
} from "@/app/(admin)/actions";
import { SectionHeading } from "@/components/admin/section-heading";
import { TableStatusCard, type TableStatusItem } from "@/components/admin/table-status-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FieldError, FieldLabel, Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import type { TableRow, ZoneRow } from "@/lib/server/serializers";
import { cn } from "@/lib/utils";

type ViewMode = "list" | "diagram";

type ActionValidationResult = {
  ok: boolean;
  fieldErrors?: Record<string, string>;
  formError?: string;
};

type TableEditorItem = TableStatusItem;

type ZoneEditorItem = Pick<ZoneRow, "id" | "name" | "slug">;

type DeleteTarget =
  | { type: "table"; id: number; label: string }
  | { type: "zone"; id: number; label: string };

const toneMap = {
  available: "success",
  reserved: "warning",
  occupied: "info",
  cleaning: "default",
} as const;

const tableStatusOptions = [
  { value: "available", label: "Sẵn sàng" },
  { value: "reserved", label: "Đã đặt trước" },
  { value: "occupied", label: "Đang phục vụ" },
  { value: "cleaning", label: "Đang dọn" },
] as const;

const tableStatusLabelMap = Object.fromEntries(tableStatusOptions.map((option) => [option.value, option.label])) as Record<(typeof tableStatusOptions)[number]["value"], string>;

function buildTableLayout(index: number, seats: number) {
  const column = index % 3;
  const row = Math.floor(index / 3);
  return {
    x: 24 + column * 156,
    y: 24 + row * 110,
    width: 132,
    height: 82,
    shape: seats <= 4 ? "rect" : "rect",
  } as const;
}

function mapRowsToTableItems(rows: TableRow[]): TableEditorItem[] {
  const grouped = new Map<string, TableRow[]>();

  for (const row of rows) {
    const zoneName = row.zoneName ?? "Chưa gán khu";
    const current = grouped.get(zoneName) ?? [];
    current.push(row);
    grouped.set(zoneName, current);
  }

  return Array.from(grouped.entries()).flatMap(([zoneName, items]) =>
    items
      .slice()
      .sort((left, right) => left.code.localeCompare(right.code))
      .map((item, index) => ({
        id: item.id,
        code: item.code,
        zoneId: item.zoneId,
        zone: zoneName,
        status: item.status,
        seats: item.seats,
        createdAt: item.createdAt,
        layout: buildTableLayout(index, item.seats),
      })),
  );
}

export function TablesContent({ tables, zones }: { tables: TableRow[]; zones: Array<Pick<ZoneRow, "id" | "name" | "slug">> }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedTable, setSelectedTable] = useState<TableEditorItem | null>(null);
  const [selectedZone, setSelectedZone] = useState<ZoneEditorItem | null>(null);
  const [statusFormError, setStatusFormError] = useState<string | null>(null);
  const [statusTargetId, setStatusTargetId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [tableFieldErrors, setTableFieldErrors] = useState<Record<string, string>>({});
  const [tableFormError, setTableFormError] = useState<string | null>(null);
  const [zoneFieldErrors, setZoneFieldErrors] = useState<Record<string, string>>({});
  const [zoneFormError, setZoneFormError] = useState<string | null>(null);
  const [deleteFormError, setDeleteFormError] = useState<string | null>(null);

  const tableItems = useMemo(() => mapRowsToTableItems(tables), [tables]);
  const groupedZones = useMemo(() => {
    const grouped = new Map<string, TableEditorItem[]>();
    for (const table of tableItems) {
      const current = grouped.get(table.zone) ?? [];
      current.push(table);
      grouped.set(table.zone, current);
    }
    return Array.from(grouped.entries()).map(([zone, items]) => ({ zone, items }));
  }, [tableItems]);
  const zoneDiagramBounds = useMemo(() => {
    const topOffset = 48;
    const bottomPadding = 24;

    return new Map(
      groupedZones.map(({ zone, items }) => {
        const maxBottom = items.reduce((currentMax, table) => {
          const tableBottom = table.layout.y + topOffset + table.layout.height;
          return Math.max(currentMax, tableBottom);
        }, 0);

        return [zone, Math.max(320, maxBottom + bottomPadding)];
      }),
    );
  }, [groupedZones]);

  const zoneUsage = useMemo(() => {
    const usage = new Map<number, number>();
    for (const table of tableItems) {
      if (!table.zoneId) continue;
      usage.set(table.zoneId, (usage.get(table.zoneId) ?? 0) + 1);
    }
    return usage;
  }, [tableItems]);

  const clearTableError = (field: string) => {
    if (!tableFieldErrors[field] && !tableFormError) return undefined;
    return () => {
      setTableFieldErrors((current) => {
        if (!current[field]) return current;
        const next = { ...current };
        delete next[field];
        return next;
      });
      setTableFormError(null);
    };
  };

  const clearZoneError = (field: string) => {
    if (!zoneFieldErrors[field] && !zoneFormError) return undefined;
    return () => {
      setZoneFieldErrors((current) => {
        if (!current[field]) return current;
        const next = { ...current };
        delete next[field];
        return next;
      });
      setZoneFormError(null);
    };
  };

  const openAddTable = () => {
    setSelectedTable(null);
    setTableFieldErrors({});
    setTableFormError(null);
    setIsTableModalOpen(true);
  };

  const openEditTable = (table: TableEditorItem) => {
    setSelectedTable(table);
    setTableFieldErrors({});
    setTableFormError(null);
    setIsTableModalOpen(true);
  };

  const openAddZone = () => {
    setSelectedZone(null);
    setZoneFieldErrors({});
    setZoneFormError(null);
    setIsZoneModalOpen(true);
  };

  const openEditZone = (zone: ZoneEditorItem) => {
    setSelectedZone(zone);
    setZoneFieldErrors({});
    setZoneFormError(null);
    setIsZoneModalOpen(true);
  };

  const openDeleteTable = (table: TableEditorItem) => {
    setDeleteTarget({ type: "table", id: table.id, label: table.code });
    setDeleteFormError(null);
    setIsDeleteConfirmOpen(true);
  };

  const openDeleteZone = (zone: ZoneEditorItem) => {
    setDeleteTarget({ type: "zone", id: zone.id, label: zone.name });
    setDeleteFormError(null);
    setIsDeleteConfirmOpen(true);
  };

  const onSaveTable = async (formData: FormData) => {
    setTableFieldErrors({});
    setTableFormError(null);

    startTransition(async () => {
      try {
        const result = (await saveTableAction(formData)) as ActionValidationResult;
        if (!result.ok) {
          setTableFieldErrors(result.fieldErrors || {});
          setTableFormError(result.formError || null);
          return;
        }

        setIsTableModalOpen(false);
        setSelectedTable(null);
        router.refresh();
      } catch {
        setTableFormError("Không thể lưu bàn lúc này. Vui lòng thử lại.");
      }
    });
  };

  const onSaveZone = async (formData: FormData) => {
    setZoneFieldErrors({});
    setZoneFormError(null);

    startTransition(async () => {
      try {
        const result = (await saveZoneAction(formData)) as ActionValidationResult;
        if (!result.ok) {
          setZoneFieldErrors(result.fieldErrors || {});
          setZoneFormError(result.formError || null);
          return;
        }

        setIsZoneModalOpen(false);
        setSelectedZone(null);
        router.refresh();
      } catch {
        setZoneFormError("Không thể lưu khu vực lúc này. Vui lòng thử lại.");
      }
    });
  };

  const onQuickUpdateStatus = (table: TableEditorItem, status: TableEditorItem["status"]) => {
    if (table.status === status) return;

    setStatusFormError(null);
    setStatusTargetId(table.id);

    const formData = new FormData();
    formData.set("id", String(table.id));
    formData.set("status", status);

    startTransition(async () => {
      try {
        const result = (await updateTableStatusAction(formData)) as ActionValidationResult;
        if (!result.ok) {
          setStatusFormError(result.formError || result.fieldErrors?.status || "Không thể cập nhật trạng thái bàn.");
          return;
        }

        setStatusTargetId(null);
        router.refresh();
      } catch {
        setStatusFormError("Không thể cập nhật trạng thái bàn lúc này. Vui lòng thử lại.");
      }
    });
  };

  const onDelete = async () => {
    if (!deleteTarget) return;

    const formData = new FormData();
    formData.set("id", String(deleteTarget.id));

    startTransition(async () => {
      try {
        const result = deleteTarget.type === "table"
          ? ((await deleteTableAction(formData)) as ActionValidationResult)
          : ((await deleteZoneAction(formData)) as ActionValidationResult);

        if (!result.ok) {
          setDeleteFormError(result.formError || "Không thể xóa lúc này.");
          return;
        }

        setIsDeleteConfirmOpen(false);
        setDeleteTarget(null);
        router.refresh();
      } catch {
        setDeleteFormError("Không thể xóa lúc này. Vui lòng thử lại.");
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent>
          <SectionHeading
            title="Quản trị khu vực"
            description="Thêm, sửa và kiểm soát các zone dùng chung cho bàn, booking và vận hành phục vụ."
            actions={
              <Button onClick={openAddZone}>
                <Plus className="h-4 w-4" />
                Thêm khu vực
              </Button>
            }
          />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {zones.map((zone) => (
              <Card key={zone.id} className="border-dashed">
                <CardContent className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-[family:var(--font-coiny)] text-lg text-[var(--forest-dark)]">{zone.name}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--muted)]">{zone.slug}</div>
                    </div>
                    <Badge tone="default">{zoneUsage.get(zone.id) ?? 0} bàn</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="ghost" className="min-h-10 px-3" onClick={() => openEditZone(zone)}>
                      <Edit className="h-4 w-4" />
                      Sửa khu vực
                    </Button>
                    <Button variant="danger" className="min-h-10 px-3" onClick={() => openDeleteZone(zone)}>
                      <Trash2 className="h-4 w-4" />
                      Xóa khu vực
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <SectionHeading
            title="Quản trị bàn"
            description="Thêm, sửa, xóa bàn và cập nhật trạng thái theo từng khu vực."
            actions={
              <div className="flex flex-wrap gap-2">
                <Button onClick={openAddTable}>
                  <Plus className="h-4 w-4" />
                  Thêm bàn
                </Button>
                <Button
                  variant="outline"
                  aria-pressed={viewMode === "diagram"}
                  onClick={() => setViewMode((current) => (current === "list" ? "diagram" : "list"))}
                >
                  {viewMode === "list" ? <MapPinned className="h-4 w-4" /> : <Rows3 className="h-4 w-4" />}
                  {viewMode === "list" ? "Chuyển sang sơ đồ" : "Chuyển sang danh sách"}
                </Button>
              </div>
            }
          />

          {viewMode === "list" ? (
            <div className="space-y-3">
              {statusFormError ? <div className="rounded-[16px] border border-[rgba(159,75,62,0.18)] bg-[rgba(159,75,62,0.08)] px-4 py-3 text-sm text-[#8a3527]">{statusFormError}</div> : null}
              <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {tableItems.map((table) => (
                  <TableStatusCard
                    key={table.id}
                    table={table}
                    statusOptions={tableStatusOptions}
                    isStatusPending={isPending && statusTargetId === table.id}
                    onEdit={openEditTable}
                    onDelete={openDeleteTable}
                    onUpdateStatus={onQuickUpdateStatus}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {groupedZones.map(({ zone, items }) => (
                <Card key={zone}>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-[family:var(--font-coiny)] text-lg text-[var(--forest-dark)]">{zone}</div>
                        <div className="mt-1 text-sm text-[var(--muted)]">{items.length} bàn trong sơ đồ</div>
                      </div>
                      <Badge tone="default">Sơ đồ zone</Badge>
                    </div>
                    <div
                      className="relative overflow-visible rounded-[24px] border border-dashed border-[color:var(--line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(232,244,227,0.7))] pt-14"
                      style={{ minHeight: `${zoneDiagramBounds.get(zone) ?? 320}px` }}
                    >
                      <div className="pointer-events-none absolute inset-x-5 top-4 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                        <span>Lối đi</span>
                        <span>{zone}</span>
                      </div>
                      {items.map((table) => (
                        <button
                          key={table.id}
                          type="button"
                          className={cn(
                            "absolute flex flex-col items-center justify-between border border-white/70 bg-white/90 px-4 py-3 text-center shadow-[0_12px_24px_rgba(45,82,44,0.12)] transition-transform duration-200 hover:-translate-y-0.5",
                            table.layout.shape === "round" ? "rounded-[999px]" : "rounded-[22px]",
                          )}
                          style={{
                            left: `${table.layout.x}px`,
                            top: `${table.layout.y + 48}px`,
                            width: `${table.layout.width}px`,
                            height: `${table.layout.height}px`,
                          }}
                          onClick={() => openEditTable(table)}
                        >
                          <span className="font-[family:var(--font-coiny)] text-base text-[var(--forest-dark)]">{table.code}</span>
                          <div className="w-full space-y-1 text-xs text-[var(--muted)]">
                            <div>{table.seats} khách</div>
                            <Badge tone={toneMap[table.status]} className="min-h-7 whitespace-nowrap px-3 py-1 text-[10px]">
                              {tableStatusLabelMap[table.status]}
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
        </CardContent>
      </Card>

      <Modal
        isOpen={isZoneModalOpen}
        onClose={() => !isPending && setIsZoneModalOpen(false)}
        title={selectedZone ? "Sửa khu vực" : "Thêm khu vực"}
      >
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            void onSaveZone(new FormData(event.currentTarget));
          }}
        >
          {selectedZone ? <input type="hidden" name="id" value={selectedZone.id} /> : null}

          {zoneFormError ? <div className="rounded-[16px] border border-[rgba(159,75,62,0.18)] bg-[rgba(159,75,62,0.08)] px-4 py-3 text-sm text-[#8a3527]">{zoneFormError}</div> : null}

          <div>
            <FieldLabel>Tên khu vực</FieldLabel>
            <Input name="name" defaultValue={selectedZone?.name || ""} invalid={Boolean(zoneFieldErrors.name)} onChange={clearZoneError("name")} />
            <FieldError>{zoneFieldErrors.name}</FieldError>
          </div>

          <div>
            <FieldLabel>Slug khu vực</FieldLabel>
            <Input
              name="slug"
              defaultValue={selectedZone?.slug || ""}
              placeholder="tu-dong-tu-ten-neu-bo-trong"
              invalid={Boolean(zoneFieldErrors.slug)}
              onChange={clearZoneError("slug")}
            />
            <FieldError>{zoneFieldErrors.slug}</FieldError>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsZoneModalOpen(false)} disabled={isPending}>Đóng</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Đang lưu..." : "Lưu khu vực"}</Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isTableModalOpen}
        onClose={() => !isPending && setIsTableModalOpen(false)}
        title={selectedTable ? "Sửa bàn" : "Thêm bàn"}
      >
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            void onSaveTable(new FormData(event.currentTarget));
          }}
        >
          {selectedTable ? <input type="hidden" name="id" value={selectedTable.id} /> : null}

          {tableFormError ? <div className="rounded-[16px] border border-[rgba(159,75,62,0.18)] bg-[rgba(159,75,62,0.08)] px-4 py-3 text-sm text-[#8a3527]">{tableFormError}</div> : null}

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <FieldLabel>Mã bàn</FieldLabel>
              <Input name="code" defaultValue={selectedTable?.code || ""} invalid={Boolean(tableFieldErrors.code)} onChange={clearTableError("code")} />
              <FieldError>{tableFieldErrors.code}</FieldError>
            </div>
            <div>
              <FieldLabel>Sức chứa</FieldLabel>
              <Input name="seats" type="number" min={1} defaultValue={selectedTable?.seats || 4} invalid={Boolean(tableFieldErrors.seats)} onChange={clearTableError("seats")} />
              <FieldError>{tableFieldErrors.seats}</FieldError>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <FieldLabel>Khu vực</FieldLabel>
              <Select name="zoneId" defaultValue={selectedTable?.zoneId ? String(selectedTable.zoneId) : ""} invalid={Boolean(tableFieldErrors.zoneId)} onChange={clearTableError("zoneId")}>
                <option value="">Chưa gán khu</option>
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>{zone.name}</option>
                ))}
              </Select>
              <FieldError>{tableFieldErrors.zoneId}</FieldError>
            </div>
            <div>
              <FieldLabel>Trạng thái</FieldLabel>
              <Select name="status" defaultValue={selectedTable?.status || "available"} invalid={Boolean(tableFieldErrors.status)} onChange={clearTableError("status")}>
                {tableStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
              <FieldError>{tableFieldErrors.status}</FieldError>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsTableModalOpen(false)} disabled={isPending}>Đóng</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Đang lưu..." : "Lưu bàn"}</Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isDeleteConfirmOpen}
        onClose={() => !isPending && setIsDeleteConfirmOpen(false)}
        title={deleteTarget?.type === "zone" ? "Xóa khu vực" : "Xóa bàn"}
        className="max-w-xl"
      >
        <div className="space-y-5">
          <div className="rounded-[16px] border border-[rgba(159,75,62,0.18)] bg-[rgba(159,75,62,0.08)] px-4 py-3 text-sm text-[#8a3527]">
            {deleteTarget?.type === "zone"
              ? `Xóa khu vực ${deleteTarget.label}. Nếu khu vực còn liên kết với bàn, booking hoặc yêu cầu phục vụ, hệ thống sẽ chặn thao tác này.`
              : `Xóa bàn ${deleteTarget?.label}. Nếu bàn còn liên kết với booking hoặc yêu cầu phục vụ, hệ thống sẽ chặn thao tác này.`}
          </div>

          {deleteFormError ? <div className="text-sm text-[#8a3527]">{deleteFormError}</div> : null}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsDeleteConfirmOpen(false)} disabled={isPending}>Đóng</Button>
            <Button type="button" variant="danger" onClick={onDelete} disabled={isPending}>
              {isPending ? "Đang xóa..." : "Xác nhận xóa"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
