"use client";

import { Check, Edit, ImagePlus, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  deleteMenuItemAction,
  deleteMenuSectionAction,
  reorderMenuItemsAction,
  reorderMenuSectionsAction,
  saveMenuItemAction,
  saveMenuSectionAction,
  toggleMenuItemVisibleAction,
  toggleMenuSectionVisibleAction,
} from "@/app/(admin)/actions";
import { cn } from "@/lib/utils";
import { SectionHeading } from "@/components/admin/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FieldError, FieldLabel, Input, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import type { MenuSectionWithItemsRow } from "@/lib/server/serializers";

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

type ActionValidationResult = {
  ok: boolean;
  fieldErrors?: Record<string, string>;
  formError?: string;
  sectionCount?: number;
  itemCount?: number;
};

type ModalState =
  | { type: "section"; sectionId?: number }
  | { type: "item"; sectionId: number; itemId?: number }
  | null;

const locales = ["vi", "en", "zh", "ko", "ja"] as const;

export function MenuContent({ sections }: { sections: MenuSectionWithItemsRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [visiblePendingId, setVisiblePendingId] = useState<{ type: "section" | "item"; id: number } | null>(null);
  const [modalState, setModalState] = useState<ModalState>(null);
  const [deleteState, setDeleteState] = useState<{ type: "section" | "item"; id: number } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [imagePath, setImagePath] = useState("");
  const formRef = useRef<HTMLFormElement | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const sectionMap = useMemo(() => new Map(sections.map((section) => [section.id, section])), [sections]);
  const selectedSection = modalState?.type === "section" && modalState.sectionId ? sectionMap.get(modalState.sectionId) || null : null;
  const selectedItem = modalState?.type === "item" && modalState.itemId
    ? sections.flatMap((section) => section.items).find((item) => item.id === modalState.itemId) || null
    : null;

  const resetForm = () => {
    setFieldErrors({});
    setFormError(null);
    setUploadError(null);
  };

  const openSectionModal = (sectionId?: number) => {
    resetForm();
    setImagePath("");
    setModalState({ type: "section", sectionId });
  };

  const openItemModal = (sectionId: number, itemId?: number) => {
    resetForm();
    const item = itemId ? sections.flatMap((section) => section.items).find((entry) => entry.id === itemId) : null;
    setImagePath(item?.imagePath || "");
    setModalState({ type: "item", sectionId, itemId });
  };

  const closeModal = () => {
    setModalState(null);
    resetForm();
  };

  const handleToggleSectionVisible = (id: number, visible: boolean) => {
    setVisiblePendingId({ type: "section", id });
    const formData = new FormData();
    formData.set("id", String(id));
    formData.set("visible", visible ? "true" : "");
    startTransition(async () => {
      await toggleMenuSectionVisibleAction(formData);
      setVisiblePendingId(null);
      router.refresh();
    });
  };

  const handleToggleItemVisible = (id: number, visible: boolean) => {
    setVisiblePendingId({ type: "item", id });
    const formData = new FormData();
    formData.set("id", String(id));
    formData.set("visible", visible ? "true" : "");
    startTransition(async () => {
      await toggleMenuItemVisibleAction(formData);
      setVisiblePendingId(null);
      router.refresh();
    });
  };

  const onReorderSection = (id: number, sortOrder: number) => {
    const formData = new FormData();
    formData.set("id", String(id));
    formData.set("sortOrder", String(sortOrder));
    startTransition(async () => {
      await reorderMenuSectionsAction(formData);
      router.refresh();
    });
  };

  const onReorderItem = (sectionId: number, id: number, sortOrder: number) => {
    const formData = new FormData();
    formData.set("id", String(id));
    formData.set("sectionId", String(sectionId));
    formData.set("sortOrder", String(sortOrder));
    startTransition(async () => {
      await reorderMenuItemsAction(formData);
      router.refresh();
    });
  };

  const onDelete = () => {
    if (!deleteState) return;
    const formData = new FormData();
    formData.set("id", String(deleteState.id));
    startTransition(async () => {
      if (deleteState.type === "section") {
        await deleteMenuSectionAction(formData);
      } else {
        await deleteMenuItemAction(formData);
      }
      setDeleteState(null);
      router.refresh();
    });
  };

  const scrollToFirstError = (errors: Record<string, string>, hasFormError: boolean) => {
    requestAnimationFrame(() => {
      const form = formRef.current;
      if (!form) return;

      const firstErrorKey = Object.keys(errors)[0];
      const target = firstErrorKey
        ? form.querySelector<HTMLElement>(`[name="${CSS.escape(firstErrorKey)}"], [data-error-for="${CSS.escape(firstErrorKey)}"]`)
        : null;
      const fallback = hasFormError ? form.querySelector<HTMLElement>("[data-form-error]") : null;
      const element = target || fallback;

      element?.scrollIntoView({ behavior: "smooth", block: "center" });
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
        element.focus({ preventScroll: true });
      }
    });
  };

  const handleImageUpload = async (file: File | null) => {
    if (!file) return;
    setIsUploadingImage(true);
    setUploadError(null);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      const response = await fetch("/api/upload", { method: "POST", body: uploadFormData });
      if (!response.ok) throw new Error("upload-failed");
      const result = (await response.json()) as { path?: string };
      if (!result.path) throw new Error("upload-path-missing");
      setImagePath(result.path);
    } catch {
      setUploadError("Upload ảnh thất bại. Vui lòng thử lại.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const onSave = async (formData: FormData) => {
    if (modalState?.type === "item") {
      formData.set("imagePath", imagePath);
      formData.set("sectionId", String(modalState.sectionId));
    }

    setFieldErrors({});
    setFormError(null);

    startTransition(async () => {
      const result = (await (modalState?.type === "section" ? saveMenuSectionAction(formData) : saveMenuItemAction(formData))) as ActionValidationResult;
      if (!result.ok) {
        const nextFieldErrors = result.fieldErrors || {};
        setFieldErrors(nextFieldErrors);
        setFormError(result.formError || "Không thể lưu dữ liệu lúc này.");
        scrollToFirstError(nextFieldErrors, Boolean(result.formError));
        return;
      }

      closeModal();
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent>
          <SectionHeading
            title="Menu catalog từ giao diện user"
            description="Quản trị đầy đủ nhóm món và món hiển thị ở SamCamping user. Dữ liệu này tách riêng khỏi module dịch vụ booking hiện tại."
            actions={
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => openSectionModal()}>
                  <Plus className="h-4 w-4" />
                  Thêm nhóm món
                </Button>
              </div>
            }
          />

          <div className="space-y-4">
            {sections.map((section, sectionIndex) => (
              <div key={section.id} className="rounded-[24px] border border-[color:var(--line)] bg-white/65 p-4 shadow-[0_10px_24px_rgba(45,82,44,0.06)]">
                <div className="flex flex-col gap-3 border-b border-dashed border-[var(--line)] pb-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 lg:w-[46%] lg:shrink-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-bold text-[var(--forest-dark)]">{section.titleI18n.vi}</h3>
                      <VisibleDropdown
                        id={section.id}
                        visible={section.visible}
                        isPending={visiblePendingId?.type === "section" && visiblePendingId.id === section.id}
                        onToggle={handleToggleSectionVisible}
                      />
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{section.descriptionI18n.vi}</p>
                  </div>

                  <div className="flex flex-wrap justify-end gap-2 lg:flex-1 lg:flex-nowrap">
                    <Button variant="ghost" size="sm" disabled={sectionIndex === 0 || isPending} onClick={() => onReorderSection(section.id, section.sortOrder - 1)}>↑</Button>
                    <Button variant="ghost" size="sm" disabled={sectionIndex === sections.length - 1 || isPending} onClick={() => onReorderSection(section.id, section.sortOrder + 1)}>↓</Button>
                    <Button variant="ghost" size="sm" onClick={() => openSectionModal(section.id)}>
                      <Edit className="h-4 w-4" />
                      Sửa nhóm
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openItemModal(section.id)}>
                      <Plus className="h-4 w-4" />
                      Thêm món
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => setDeleteState({ type: "section", id: section.id })}>
                      <Trash2 className="h-4 w-4" />
                      Xóa nhóm
                    </Button>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {section.items.map((item, itemIndex) => (
                    <article key={item.id} className="flex h-full flex-col rounded-[20px] border border-[color:var(--line)] bg-[rgba(244,251,240,0.76)] p-4">
                      <div className="relative aspect-[1.4] overflow-hidden rounded-[16px] bg-[linear-gradient(180deg,rgba(12,27,18,0.08),rgba(12,27,18,0.22))]">
                        {item.imagePath ? <img src={item.imagePath} alt={item.nameI18n.vi} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-[var(--muted)]"><ImagePlus className="h-8 w-8" /></div>}
                      </div>
                      <div className="mt-3 flex items-start justify-between gap-3">
                        <div>
                          <div className="font-bold text-[var(--forest-dark)]">{item.nameI18n.vi}</div>
                          <div className="mt-1 text-xs text-[var(--muted)]">{item.noteI18n.vi}</div>
                        </div>
                        <VisibleDropdown
                          id={item.id}
                          visible={item.visible}
                          isPending={visiblePendingId?.type === "item" && visiblePendingId.id === item.id}
                          onToggle={handleToggleItemVisible}
                        />
                      </div>
                      <div className="mt-2 text-lg font-bold text-[var(--forest)]">{item.priceLabel}</div>
                      <p className="mt-2 pb-5 line-clamp-2 text-sm leading-6 text-[var(--muted)]">{item.descriptionI18n.vi}</p>
                      <div className="mt-auto flex flex-wrap gap-2 border-t border-dashed border-[var(--line)] pt-4">
                        <Button variant="ghost" size="sm" disabled={itemIndex === 0 || isPending} onClick={() => onReorderItem(section.id, item.id, item.sortOrder - 1)}>↑</Button>
                        <Button variant="ghost" size="sm" disabled={itemIndex === section.items.length - 1 || isPending} onClick={() => onReorderItem(section.id, item.id, item.sortOrder + 1)}>↓</Button>
                        <Button variant="ghost" size="sm" onClick={() => openItemModal(section.id, item.id)}>
                          <Edit className="h-4 w-4" />
                          Sửa
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => setDeleteState({ type: "item", id: item.id })}>
                          <Trash2 className="h-4 w-4" />
                          Xóa
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ))}

            {sections.length === 0 ? (
              <div className="rounded-[20px] border border-[color:var(--line)] bg-white/70 px-4 py-12 text-center text-sm text-[var(--muted)]">
                Chưa có dữ liệu menu catalog. Bấm đồng bộ để lấy toàn bộ món từ giao diện user hiện tại.
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Modal isOpen={modalState !== null} onClose={closeModal} title={modalState?.type === "section" ? (selectedSection ? "Chỉnh sửa nhóm món" : "Tạo nhóm món") : (selectedItem ? "Chỉnh sửa món" : "Tạo món mới")}>
        <form ref={formRef} action={onSave} className="space-y-4">
          {formError ? <div data-form-error className="rounded-[16px] border border-[rgba(159,75,62,0.18)] bg-[rgba(159,75,62,0.08)] px-4 py-3 text-sm text-[#8a3527]">{formError}</div> : null}
          {modalState?.type === "section" && selectedSection ? (
            <>
              <input type="hidden" name="id" value={selectedSection.id} />
              <input type="hidden" name="slug" value={selectedSection.slug} />
            </>
          ) : null}
          {modalState?.type === "item" && selectedItem ? (
            <>
              <input type="hidden" name="id" value={selectedItem.id} />
              <input type="hidden" name="slug" value={selectedItem.slug} />
            </>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            {modalState?.type === "section" ? (
              <>
                <div className="sm:col-span-2">
                  <FieldLabel>Tên nhóm món (vi)</FieldLabel>
                  <Input name="titleVi" defaultValue={selectedSection?.titleI18n.vi || ""} invalid={Boolean(fieldErrors.titleVi)} />
                  <FieldError>{fieldErrors.titleVi}</FieldError>
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel>Mô tả (vi)</FieldLabel>
                  <Textarea name="descriptionVi" rows={3} defaultValue={selectedSection?.descriptionI18n.vi || ""} />
                </div>
                <div>
                  <FieldLabel>Vị trí</FieldLabel>
                  <Input name="sortOrder" type="number" min={1} defaultValue={selectedSection?.sortOrder || sections.length + 1} />
                </div>
                <div>
                  <FieldLabel>Trạng thái</FieldLabel>
                  <Select name="visible" defaultValue={selectedSection?.visible === false ? "hidden" : "visible"}>
                    <option value="visible">Hiển thị</option>
                    <option value="hidden">Ẩn</option>
                  </Select>
                </div>
                {locales.map((locale) => (
                  <div key={locale} className="sm:col-span-2 grid gap-3 rounded-2xl border border-[var(--line)] p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Bản dịch {locale}</div>
                    <Input name={`titleI18n_${locale}`} defaultValue={selectedSection?.titleI18n?.[locale] || ""} placeholder={`Tên ${locale}`} />
                    <Textarea name={`descriptionI18n_${locale}`} rows={2} defaultValue={selectedSection?.descriptionI18n?.[locale] || ""} placeholder={`Mô tả ${locale}`} />
                  </div>
                ))}
              </>
            ) : (
              <>
                <div className="sm:col-span-2">
                  <FieldLabel>Tên món (vi)</FieldLabel>
                  <Input name="nameVi" defaultValue={selectedItem?.nameI18n.vi || ""} invalid={Boolean(fieldErrors.nameVi)} />
                  <FieldError>{fieldErrors.nameVi}</FieldError>
                </div>
                <div>
                  <FieldLabel>Giá hiển thị</FieldLabel>
                  <Input name="priceLabel" defaultValue={selectedItem?.priceLabel || ""} invalid={Boolean(fieldErrors.priceLabel)} />
                  <FieldError>{fieldErrors.priceLabel}</FieldError>
                </div>
                <div>
                  <FieldLabel>Vị trí</FieldLabel>
                  <Input name="sortOrder" type="number" min={1} defaultValue={selectedItem?.sortOrder || ((sectionMap.get(modalState?.sectionId || 0)?.items.length || 0) + 1)} />
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel>Meta / note (vi)</FieldLabel>
                  <Input name="noteVi" defaultValue={selectedItem?.noteI18n.vi || ""} />
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel>Mô tả (vi)</FieldLabel>
                  <Textarea name="descriptionVi" rows={3} defaultValue={selectedItem?.descriptionI18n.vi || ""} />
                </div>
                <div className="sm:col-span-2 space-y-3">
                  <FieldLabel>Ảnh món</FieldLabel>
                  <input type="hidden" name="imagePath" value={imagePath} readOnly />
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-[14px] border border-dashed border-[var(--line)] px-4 py-6 text-sm font-semibold text-[var(--forest-dark)] transition hover:border-[var(--mint-deep)] hover:bg-[rgba(110,149,101,0.08)]">
                    {isUploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                    <span>{isUploadingImage ? "Đang upload ảnh..." : "Chọn ảnh để upload"}</span>
                    <input type="file" accept="image/*" className="hidden" disabled={isUploadingImage} onChange={(event) => {
                      const file = event.currentTarget.files?.[0] ?? null;
                      void handleImageUpload(file);
                      event.currentTarget.value = "";
                    }} />
                  </label>
                  {imagePath ? <div className="text-xs text-[var(--muted)]">{imagePath}</div> : <div className="text-xs text-[var(--muted)]">Chưa có ảnh.</div>}
                  {uploadError ? <div className="text-xs text-[#8a3527]">{uploadError}</div> : null}
                  <FieldError>{fieldErrors.imagePath}</FieldError>
                </div>
                <div>
                  <FieldLabel>Trạng thái</FieldLabel>
                  <Select name="visible" defaultValue={selectedItem?.visible === false ? "hidden" : "visible"}>
                    <option value="visible">Hiển thị</option>
                    <option value="hidden">Ẩn</option>
                  </Select>
                </div>
                {locales.map((locale) => (
                  <div key={locale} className="sm:col-span-2 grid gap-3 rounded-2xl border border-[var(--line)] p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Bản dịch {locale}</div>
                    <Input name={`nameI18n_${locale}`} defaultValue={selectedItem?.nameI18n?.[locale] || ""} placeholder={`Tên ${locale}`} />
                    <Input name={`noteI18n_${locale}`} defaultValue={selectedItem?.noteI18n?.[locale] || ""} placeholder={`Meta ${locale}`} />
                    <Textarea name={`descriptionI18n_${locale}`} rows={2} defaultValue={selectedItem?.descriptionI18n?.[locale] || ""} placeholder={`Mô tả ${locale}`} />
                  </div>
                ))}
              </>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={closeModal}>Hủy</Button>
            <Button type="submit" disabled={isPending}>
              <Save className="h-4 w-4" />
              {isPending ? "Đang lưu..." : "Lưu"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={deleteState !== null} onClose={() => setDeleteState(null)} title="Xác nhận xóa" className="max-w-md">
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-[var(--muted)]">Hành động này sẽ xóa dữ liệu khỏi menu catalog. Bạn có chắc chắn muốn tiếp tục?</p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setDeleteState(null)}>Hủy</Button>
            <Button variant="danger" onClick={onDelete} disabled={isPending}>{isPending ? "Đang xóa..." : "Xác nhận xóa"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
