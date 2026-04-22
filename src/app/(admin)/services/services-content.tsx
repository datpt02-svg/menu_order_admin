"use client";

import { Edit, Save, Trash2, Plus, ImagePlus } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { deleteServiceAction, saveServiceAction } from "@/app/(admin)/actions";
import { SectionHeading } from "@/components/admin/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FieldLabel, Input, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";

export type ServiceItem = {
  id: number;
  name: string;
  slug: string;
  category: string;
  priceLabel: string;
  description: string | null;
  imagePath: string | null;
  visible: boolean;
  sortOrder: number;
};

function formatPriceLabel(value: string) {
  return value;
}

export function ServicesContent({ services }: { services: ServiceItem[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedItem, setSelectedItem] = useState<ServiceItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);

  const handleAdd = () => {
    setSelectedItem(null);
    setIsModalOpen(true);
  };

  const handleEdit = (item: ServiceItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id: number) => {
    setItemToDelete(id);
    setIsDeleteConfirmOpen(true);
  };

  const onSave = async (formData: FormData) => {
    startTransition(async () => {
      await saveServiceAction(formData);
      setIsModalOpen(false);
      router.refresh();
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
      {/* Main Block: Danh sách dịch vụ */}
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
          
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {services.map((item) => (
              <article 
                key={item.id} 
                className="group relative flex flex-col rounded-[22px] border border-[var(--line)] bg-white/65 p-4 shadow-[0_10px_24px_rgba(45,82,44,0.06)] transition-all hover:bg-white/80 hover:shadow-lg"
              >
                {/* Image Section */}
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
                  
                  {/* Actions Overlay */}
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

                {/* Content Section */}
                <div className="mt-4 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-bold text-[var(--forest-dark)] leading-tight">{item.name}</div>
                    <Badge tone={item.visible ? "success" : "warning"}>
                      {item.visible ? "Hiện" : "Ẩn"}
                    </Badge>
                  </div>
                  <div className="mt-1 text-xs font-medium uppercase tracking-wider text-[var(--muted)]">{item.category}</div>
                  
                  <div className="mt-3 text-lg font-bold text-[var(--forest)]">{formatPriceLabel(item.priceLabel)}</div>
                  <div className="mt-2 text-sm leading-relaxed text-[var(--muted)] line-clamp-2">
                    {item.description || "Chưa có mô tả."}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-dashed border-[var(--line)] flex items-center justify-between">
                   <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Thứ tự: {item.sortOrder}</div>
                   <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => handleEdit(item)}>
                     Chi tiết
                   </Button>
                </div>
              </article>
            ))}
          </div>

          {services.length === 0 && (
            <div className="py-20 text-center">
              <div className="text-[var(--muted)]">Chưa có dịch vụ nào. Hãy bắt đầu bằng cách thêm dịch vụ mới.</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal: Thêm/Sửa dịch vụ */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedItem ? "Chỉnh sửa dịch vụ" : "Tạo dịch vụ mới"}
      >
        <form action={onSave} className="space-y-4">
          {selectedItem && <input type="hidden" name="id" value={selectedItem.id} />}
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FieldLabel>Tên dịch vụ</FieldLabel>
              <Input name="name" defaultValue={selectedItem?.name} required placeholder="Ví dụ: Tiệc BBQ sân vườn" />
            </div>
            
            <div>
              <FieldLabel>Slug</FieldLabel>
              <Input name="slug" defaultValue={selectedItem?.slug} required placeholder="tiec-bbq-san-vuon" />
            </div>

            <div>
              <FieldLabel>Giá hiển thị</FieldLabel>
              <Input name="priceLabel" defaultValue={selectedItem?.priceLabel} required placeholder="Ví dụ: 250k / người" />
            </div>

            <div>
              <FieldLabel>Danh mục</FieldLabel>
              <Select name="category" defaultValue={selectedItem?.category || "Dịch vụ"}>
                <option value="BBQ">BBQ</option>
                <option value="Cafe">Cafe</option>
                <option value="Dịch vụ">Dịch vụ</option>
                <option value="Sự kiện">Sự kiện</option>
              </Select>
            </div>

            <div>
              <FieldLabel>Thứ tự hiển thị</FieldLabel>
              <Input name="sortOrder" type="number" defaultValue={selectedItem?.sortOrder || 0} />
            </div>

            <div className="sm:col-span-2">
              <FieldLabel>Đường dẫn ảnh</FieldLabel>
              <Input name="imagePath" defaultValue={selectedItem?.imagePath || ""} placeholder="/uploads/service-1.jpg" />
              <p className="mt-1 text-[10px] text-[var(--muted)] italic">* Bạn có thể dùng công cụ Upload API ở thanh tiêu đề để lấy link ảnh.</p>
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
              <Textarea name="description" defaultValue={selectedItem?.description || ""} rows={4} placeholder="Nhập mô tả chi tiết về dịch vụ..." />
            </div>
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

      {/* Dialog: Xác nhận xóa */}
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
