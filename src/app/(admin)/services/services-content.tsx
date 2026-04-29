"use client";

import { Check, Edit, Save, Trash2, Plus, ImagePlus, Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { deleteServiceAction, saveServiceAction, toggleServiceVisibleAction } from "@/app/(admin)/actions";
import { cn } from "@/lib/utils";
import { SectionHeading } from "@/components/admin/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FieldError, FieldLabel, Input, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import type { ZoneRow } from "@/lib/server/serializers";

export type ServiceItem = {
  id: number;
  name: string;
  slug: string;
  category: string;
  priceLabel: string;
  description: string | null;
  imagePath: string | null;
  visible: boolean;
  bookingEnabled: boolean;
  zoneSlug: string | null;
  nameI18n: Record<string, string> | null;
  descriptionI18n: Record<string, string> | null;
  priceLabelI18n: Record<string, string> | null;
  sortOrder: number;
};

type ActionValidationResult = {
  ok: boolean;
  fieldErrors?: Record<string, string>;
  formError?: string;
};

type ZoneItem = Pick<ZoneRow, "id" | "slug" | "name">;

function VisibleDropdown({
  id,
  visible,
  onToggle,
  isPending,
}: {
  id: number;
  visible: boolean;
  onToggle: (id: number, visible: boolean) => void;
  isPending: boolean;
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

  const options = [
    { value: true, label: "Hiện" },
    { value: false, label: "Ẩn" },
  ];

  return (
    <details ref={detailsRef} className="group relative shrink-0">
      <summary className="list-none marker:hidden [&::-webkit-details-marker]:hidden">
        <Badge
          tone={visible ? "success" : "warning"}
          className={cn(
            "cursor-pointer transition-opacity duration-200 hover:opacity-90 whitespace-nowrap",
            isPending && "pointer-events-none opacity-60",
          )}
        >
          {visible ? "Hiện" : "Ẩn"}
        </Badge>
      </summary>
      <div className="absolute right-0 top-[calc(100%+0.5rem)] z-20 hidden min-w-[140px] rounded-[20px] border border-[color:var(--line)] bg-[rgba(255,255,255,0.96)] p-2 shadow-[0_18px_36px_rgba(24,51,33,0.16)] backdrop-blur group-open:block">
        <div className="space-y-1">
          {options.map((option) => {
            const isActive = option.value === visible;
            return (
              <button
                key={String(option.value)}
                type="button"
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-[14px] px-3 py-2 text-left text-sm font-semibold text-[var(--forest-dark)] transition-colors duration-200",
                  isActive ? "bg-[rgba(63,111,66,0.10)] text-[var(--forest)]" : "hover:bg-[var(--panel)]",
                )}
                disabled={isPending || isActive}
                onClick={() => {
                  detailsRef.current?.removeAttribute("open");
                  onToggle(id, option.value);
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
  );
}

function getZoneLabel(zoneSlug: string | null, zoneNameBySlug: Map<string, string>) {
  if (!zoneSlug) return "Không gán khu";
  return zoneNameBySlug.get(zoneSlug) ?? "Không gán khu";
}

function moveItem(items: ServiceItem[], fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex) return items;
  const next = items.slice();
  const [item] = next.splice(fromIndex, 1);
  if (!item) return items;
  next.splice(toIndex, 0, item);
  return next.map((entry, index) => ({ ...entry, sortOrder: index + 1 }));
}

function buildReorderFormData(item: ServiceItem, sortOrder: number) {
  const formData = new FormData();
  formData.set("id", String(item.id));
  formData.set("name", item.name);
  formData.set("slug", item.slug);
  formData.set("category", item.category);
  formData.set("priceLabel", item.priceLabel);
  formData.set("description", item.description || "");
  formData.set("imagePath", item.imagePath || "");
  formData.set("visible", item.visible ? "visible" : "hidden");
  formData.set("bookingEnabled", item.bookingEnabled ? "enabled" : "disabled");
  formData.set("zoneSlug", item.zoneSlug || "");
  formData.set("sortOrder", String(sortOrder));

  for (const locale of ["vi", "en", "zh", "ko", "ja"] as const) {
    formData.set(`nameI18n_${locale}`, item.nameI18n?.[locale] || "");
    formData.set(`descriptionI18n_${locale}`, item.descriptionI18n?.[locale] || "");
    formData.set(`priceLabelI18n_${locale}`, item.priceLabelI18n?.[locale] || "");
  }

  return formData;
}

function formatPriceLabel(value: string) {
  return value;
}

export function ServicesContent({ services, zones }: { services: ServiceItem[]; zones: ZoneItem[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [visiblePendingId, setVisiblePendingId] = useState<number | null>(null);
  const [selectedItem, setSelectedItem] = useState<ServiceItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  const [imagePath, setImagePath] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [items, setItems] = useState<ServiceItem[]>(services);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dropTargetId, setDropTargetId] = useState<number | null>(null);
  const [reorderError, setReorderError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const formErrorRef = useRef<HTMLDivElement | null>(null);
  const zoneNameBySlug = useMemo(() => new Map(zones.map((zone) => [zone.slug, zone.name])), [zones]);

  useEffect(() => {
    if (!isModalOpen) return;
    if (!formError && Object.keys(fieldErrors).length === 0) return;

    const frame = window.requestAnimationFrame(() => {
      if (formErrorRef.current) {
        formErrorRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      const firstInvalidField = formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']");
      if (!firstInvalidField) return;
      firstInvalidField.scrollIntoView({ behavior: "smooth", block: "center" });
      firstInvalidField.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [fieldErrors, formError, isModalOpen]);

  const setFieldValueError = (field: string) => {
    if (!fieldErrors[field] && !formError) return undefined;
    return () => {
      setFieldErrors((current) => {
        if (!current[field]) return current;
        const next = { ...current };
        delete next[field];
        return next;
      });
      setFormError(null);
    };
  };

  const hasError = (field: string) => Boolean(fieldErrors[field]);

  const resetFormState = (item: ServiceItem | null) => {
    setSelectedItem(item);
    setImagePath(item?.imagePath || "");
    setUploadError(null);
    setFieldErrors({});
    setFormError(null);
  };

  const resetDragState = () => {
    setDraggedId(null);
    setDropTargetId(null);
  };

  const persistReorder = (nextItems: ServiceItem[], movedItemId: number, previousItems: ServiceItem[]) => {
    const movedItem = nextItems.find((item) => item.id === movedItemId);
    if (!movedItem) return;

    const targetSortOrder = nextItems.findIndex((item) => item.id === movedItemId) + 1;
    const formData = buildReorderFormData(movedItem, targetSortOrder);

    startTransition(async () => {
      try {
        const result = (await saveServiceAction(formData)) as ActionValidationResult;
        if (!result.ok) {
          setItems(previousItems);
          setReorderError(result.formError || "Không thể cập nhật vị trí dịch vụ lúc này.");
          return;
        }

        setReorderError(null);
        router.refresh();
      } catch {
        setItems(previousItems);
        setReorderError("Không thể cập nhật vị trí dịch vụ lúc này.");
      }
    });
  };

  const performReorder = (fromIndex: number, toIndex: number) => {
    if (isPending || fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;

    const previousItems = items;
    const movedItem = previousItems[fromIndex];
    if (!movedItem) return;

    const nextItems = moveItem(previousItems, fromIndex, toIndex);
    setItems(nextItems);
    setReorderError(null);
    persistReorder(nextItems, movedItem.id, previousItems);
  };

  const handleDragStart = (itemId: number) => {
    if (isPending) return;
    setDraggedId(itemId);
    setDropTargetId(itemId);
    setReorderError(null);
  };

  const handleDropOnItem = (targetId: number) => {
    if (draggedId === null || draggedId === targetId) {
      resetDragState();
      return;
    }

    const fromIndex = items.findIndex((item) => item.id === draggedId);
    const toIndex = items.findIndex((item) => item.id === targetId);
    resetDragState();
    performReorder(fromIndex, toIndex);
  };

  const handleMoveByOffset = (itemId: number, offset: -1 | 1) => {
    const currentIndex = items.findIndex((item) => item.id === itemId);
    if (currentIndex < 0) return;
    const nextIndex = currentIndex + offset;
    if (nextIndex < 0 || nextIndex >= items.length) return;
    performReorder(currentIndex, nextIndex);
  };

  const handleImageUpload = async (file: File | null) => {
    if (!file) return;

    setIsUploadingImage(true);
    setUploadError(null);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: uploadFormData,
      });

      if (!response.ok) {
        throw new Error("upload-failed");
      }

      const result = (await response.json()) as { path?: string };
      if (!result.path) {
        throw new Error("upload-path-missing");
      }

      setImagePath(result.path);
    } catch {
      setUploadError("Upload ảnh thất bại. Vui lòng thử lại.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleToggleVisible = (id: number, visible: boolean) => {
    setVisiblePendingId(id);
    const formData = new FormData();
    formData.set("id", String(id));
    formData.set("visible", visible ? "true" : "");
    startTransition(async () => {
      await toggleServiceVisibleAction(formData);
      setVisiblePendingId(null);
      router.refresh();
    });
  };

  const handleAdd = () => {
    resetFormState(null);
    setIsModalOpen(true);
  };

  const handleEdit = (item: ServiceItem) => {
    resetFormState(item);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id: number) => {
    setItemToDelete(id);
    setIsDeleteConfirmOpen(true);
  };

  const onSave = async (formData: FormData) => {
    formData.set("imagePath", imagePath);
    setFieldErrors({});
    setFormError(null);

    startTransition(async () => {
      try {
        const result = (await saveServiceAction(formData)) as ActionValidationResult;
        if (!result.ok) {
          setFieldErrors(result.fieldErrors || {});
          setFormError(result.formError || null);
          return;
        }

        setIsModalOpen(false);
        router.refresh();
      } catch {
        setFormError("Không thể lưu dịch vụ lúc này. Vui lòng thử lại.");
      }
    });
  };

  const onDelete = async () => {
    if (!itemToDelete) return;
    const formData = new FormData();
    formData.append("id", String(itemToDelete));

    startTransition(async () => {
      await deleteServiceAction(formData);
      setIsDeleteConfirmOpen(false);
      setItemToDelete(null);
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent>
          <SectionHeading
            title="Danh sách dịch vụ"
            description="Quản lý các gói dịch vụ, món ăn đặc biệt và thông tin hiển thị trên trang khách."
            actions={
              <Button onClick={handleAdd}>
                <Plus className="h-4 w-4" />
                Thêm dịch vụ mới
              </Button>
            }
          />

          {reorderError && (
            <div className="mb-4 rounded-[16px] border border-[rgba(159,75,62,0.18)] bg-[rgba(159,75,62,0.08)] px-4 py-3 text-sm text-[#8a3527]">
              {reorderError}
            </div>
          )}

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item, index) => (
              <article
                key={item.id}
                draggable={!isPending}
                aria-grabbed={draggedId === item.id}
                onDragStart={() => handleDragStart(item.id)}
                onDragOver={(event) => {
                  event.preventDefault();
                  if (draggedId !== item.id) {
                    setDropTargetId(item.id);
                  }
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  handleDropOnItem(item.id);
                }}
                onDragEnd={resetDragState}
                className="group relative flex flex-col rounded-[22px] border border-[var(--line)] bg-white/65 p-4 shadow-[0_10px_24px_rgba(45,82,44,0.06)] transition-all hover:bg-white/80 hover:shadow-lg"
                style={{
                  opacity: draggedId === item.id ? 0.6 : undefined,
                  boxShadow:
                    dropTargetId === item.id && draggedId !== item.id
                      ? "0 0 0 2px rgba(110,149,101,0.22), 0 10px 24px rgba(45,82,44,0.06)"
                      : undefined,
                  cursor: isPending ? "not-allowed" : "grab",
                }}
              >
                <div className="relative aspect-[1.25] overflow-hidden rounded-[18px] bg-[linear-gradient(180deg,rgba(12,27,18,0.08),rgba(12,27,18,0.28))]">
                  {item.imagePath ? (
                    <img
                      src={item.imagePath}
                      alt={item.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[var(--muted)] opacity-40">
                      <ImagePlus className="h-10 w-10" />
                    </div>
                  )}

                  <div className="absolute top-3 right-3 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      size="icon-sm"
                      variant="secondary"
                      className="h-8 w-8 bg-white/90 backdrop-blur-md"
                      onClick={() => handleEdit(item)}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="danger"
                      className="h-8 w-8 bg-red-50/90 backdrop-blur-md"
                      onClick={() => handleDeleteClick(item.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="mt-4 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="leading-tight font-bold text-[var(--forest-dark)]">{item.name}</div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <VisibleDropdown
                        id={item.id}
                        visible={item.visible}
                        isPending={visiblePendingId === item.id}
                        onToggle={handleToggleVisible}
                      />
                      <Badge tone={item.bookingEnabled ? "info" : "default"}>
                        {item.bookingEnabled ? "Booking" : "Không booking"}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-1 text-xs font-medium uppercase tracking-wider text-[var(--muted)]">{item.category}</div>
                  <div className="mt-1 text-[11px] text-[var(--muted)]">Khu vực: {getZoneLabel(item.zoneSlug, zoneNameBySlug)}</div>

                  <div className="mt-3 text-lg font-bold text-[var(--forest)]">{formatPriceLabel(item.priceLabel)}</div>
                  <div className="mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--muted)]">
                    {item.description || "Chưa có mô tả."}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-dashed border-[var(--line)] pt-4">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Vị trí: {item.sortOrder}</div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      disabled={isPending || index === 0}
                      onClick={() => handleMoveByOffset(item.id, -1)}
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      disabled={isPending || index === items.length - 1}
                      onClick={() => handleMoveByOffset(item.id, 1)}
                    >
                      ↓
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => handleEdit(item)}>
                      Chi tiết
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {items.length === 0 && (
            <div className="py-20 text-center">
              <div className="text-[var(--muted)]">Chưa có dịch vụ nào. Hãy bắt đầu bằng cách thêm dịch vụ mới.</div>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedItem ? "Chỉnh sửa dịch vụ" : "Tạo dịch vụ mới"}
      >
        <form ref={formRef} action={onSave} className="space-y-4">
          {selectedItem && <input type="hidden" name="id" value={selectedItem.id} />}

          <div className="grid gap-4 sm:grid-cols-2">
            {formError && (
              <div ref={formErrorRef} className="sm:col-span-2 rounded-[16px] border border-[rgba(159,75,62,0.18)] bg-[rgba(159,75,62,0.08)] px-4 py-3 text-sm text-[#8a3527]">
                {formError}
              </div>
            )}
            <div className="sm:col-span-2">
              <FieldLabel>Tên dịch vụ</FieldLabel>
              <Input name="name" defaultValue={selectedItem?.name} required placeholder="Ví dụ: Tiệc BBQ sân vườn" invalid={hasError("name")} onChange={setFieldValueError("name")} />
              <FieldError>{fieldErrors.name}</FieldError>
            </div>

            <div>
              <FieldLabel>Slug</FieldLabel>
              <Input name="slug" defaultValue={selectedItem?.slug} required placeholder="tiec-bbq-san-vuon" invalid={hasError("slug")} onChange={setFieldValueError("slug")} />
              <FieldError>{fieldErrors.slug}</FieldError>
            </div>

            <div>
              <FieldLabel>Giá hiển thị</FieldLabel>
              <Input name="priceLabel" defaultValue={selectedItem?.priceLabel} required placeholder="Ví dụ: 250k / người" invalid={hasError("priceLabel")} onChange={setFieldValueError("priceLabel")} />
              <FieldError>{fieldErrors.priceLabel}</FieldError>
            </div>

            <div>
              <FieldLabel>Danh mục</FieldLabel>
              <Select name="category" defaultValue={selectedItem?.category || "Dịch vụ"} invalid={hasError("category")} onChange={setFieldValueError("category")}>
                <option value="BBQ">BBQ</option>
                <option value="Cafe">Cafe</option>
                <option value="Dịch vụ">Dịch vụ</option>
                <option value="Sự kiện">Sự kiện</option>
              </Select>
              <FieldError>{fieldErrors.category}</FieldError>
            </div>

            <div>
              <FieldLabel>Vị trí hiển thị</FieldLabel>
              <Input name="sortOrder" type="number" min={1} defaultValue={selectedItem?.sortOrder ?? items.length + 1} invalid={hasError("sortOrder")} onChange={setFieldValueError("sortOrder")} />
              <p className="mt-1 text-xs text-[var(--muted)]">Nhập vị trí muốn chèn. Các dịch vụ khác sẽ tự động dịch chuyển.</p>
              <FieldError>{fieldErrors.sortOrder}</FieldError>
            </div>

            <div>
              <FieldLabel>Khu vực áp dụng cho booking</FieldLabel>
              <Select name="zoneSlug" defaultValue={selectedItem?.zoneSlug || "all"} invalid={hasError("zoneSlug")} onChange={setFieldValueError("zoneSlug")}>
                <option value="all">Không gán khu</option>
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.slug}>{zone.name}</option>
                ))}
              </Select>
              <FieldError>{fieldErrors.zoneSlug}</FieldError>
            </div>

            <div>
              <FieldLabel>Booking option</FieldLabel>
              <Select name="bookingEnabled" defaultValue={selectedItem?.bookingEnabled === false ? "disabled" : "enabled"}>
                <option value="enabled">Hiện trên flow booking</option>
                <option value="disabled">Không hiện trên flow booking</option>
              </Select>
            </div>

            <div className="sm:col-span-2 space-y-3">
              <FieldLabel>Ảnh dịch vụ</FieldLabel>
              <input type="hidden" name="imagePath" value={imagePath} readOnly />
              <div className={`flex flex-col gap-3 rounded-[18px] border bg-[rgba(255,255,255,0.82)] p-4 ${hasError("imagePath") ? "border-[rgba(159,75,62,0.28)]" : "border-[var(--line)]"}`}>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-[14px] border border-dashed border-[var(--line)] px-4 py-6 text-sm font-semibold text-[var(--forest-dark)] transition hover:border-[var(--mint-deep)] hover:bg-[rgba(110,149,101,0.08)]">
                  {isUploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                  <span>{isUploadingImage ? "Đang upload ảnh..." : "Chọn ảnh để upload"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={isUploadingImage}
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0] ?? null;
                      void handleImageUpload(file);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
                {imagePath ? (
                  <div className="flex items-center gap-3 rounded-[14px] bg-[rgba(110,149,101,0.08)] p-3">
                    <img src={imagePath} alt="Preview ảnh dịch vụ" className="h-16 w-16 rounded-xl object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Đã upload</div>
                      <div className="truncate text-sm text-[var(--forest-dark)]">{imagePath}</div>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setImagePath("")}>Xóa ảnh</Button>
                  </div>
                ) : (
                  <div className="text-sm text-[var(--muted)]">Chưa có ảnh. Ảnh sau khi upload sẽ tự điền vào dịch vụ.</div>
                )}
              </div>
              {uploadError && <p className="text-xs text-[#8a3527]">{uploadError}</p>}
              <FieldError>{fieldErrors.imagePath}</FieldError>
            </div>

            <div className="sm:col-span-2">
              <FieldLabel>Trạng thái hiển thị</FieldLabel>
              <Select name="visible" defaultValue={selectedItem?.visible === false ? "hidden" : "visible"}>
                <option value="visible">Hiển thị (Visible)</option>
                <option value="hidden">Ẩn (Hidden)</option>
              </Select>
            </div>

            <div className="sm:col-span-2">
              <FieldLabel>Mô tả dịch vụ</FieldLabel>
              <Textarea name="description" defaultValue={selectedItem?.description || ""} rows={4} placeholder="Nhập mô tả chi tiết về dịch vụ..." onChange={setFieldValueError("description")} />
              <FieldError>{fieldErrors.description}</FieldError>
            </div>

            {(["vi", "en", "zh", "ko", "ja"] as const).map((locale) => (
              <div key={locale} className="sm:col-span-2 grid gap-3 rounded-2xl border border-[var(--line)] p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Bản dịch {locale}</div>
                <div>
                  <FieldLabel>Tên hiển thị ({locale})</FieldLabel>
                  <Input name={`nameI18n_${locale}`} defaultValue={selectedItem?.nameI18n?.[locale] || ""} placeholder={`Tên hiển thị ${locale}`} />
                </div>
                <div>
                  <FieldLabel>Giá hiển thị ({locale})</FieldLabel>
                  <Input name={`priceLabelI18n_${locale}`} defaultValue={selectedItem?.priceLabelI18n?.[locale] || ""} placeholder={`Giá hiển thị ${locale}`} />
                </div>
                <div>
                  <FieldLabel>Mô tả ({locale})</FieldLabel>
                  <Textarea name={`descriptionI18n_${locale}`} defaultValue={selectedItem?.descriptionI18n?.[locale] || ""} rows={3} placeholder={`Mô tả ${locale}`} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button type="submit" disabled={isPending}>
              <Save className="h-4 w-4" />
              {isPending ? "Đang lưu..." : "Lưu dịch vụ"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        title="Xác nhận xóa"
        className="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-[var(--muted)]">
            Hành động này sẽ xóa vĩnh viễn dịch vụ này khỏi hệ thống. Bạn có chắc chắn muốn tiếp tục?
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsDeleteConfirmOpen(false)}>Hủy</Button>
            <Button variant="danger" onClick={onDelete} disabled={isPending}>
              {isPending ? "Đang xóa..." : "Xác nhận xóa"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
