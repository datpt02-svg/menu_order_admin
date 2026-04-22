import { ImagePlus, Plus, Save } from "lucide-react";

import { deleteServiceAction, saveServiceAction } from "@/app/(admin)/actions";
import { AdminShell } from "@/components/admin/admin-shell";
import { SectionHeading } from "@/components/admin/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FieldLabel, Input, Select, Textarea } from "@/components/ui/field";
import { safeServices } from "@/lib/server/safe-data";

function formatPriceLabel(value: string) {
  return value;
}

export default async function ServicesPage() {
  const { data: serviceItems } = await safeServices();
  const selected = serviceItems[0] ?? null;

  return (
    <AdminShell
      pathname="/services"
      title="Quản lý dịch vụ"
      description="Thêm, sửa, ẩn/hiện dịch vụ và upload ảnh theo cùng tông giao diện đang dùng ở trang khách."
      actions={
        <>
          <a href="/api/upload">
            <Button variant="outline">
              <ImagePlus className="h-4 w-4" />
              Upload API
            </Button>
          </a>
          <Button>
            <Plus className="h-4 w-4" />
            Tạo dịch vụ mới
          </Button>
        </>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_440px]">
        <Card>
          <CardContent>
            <SectionHeading title="Danh sách dịch vụ" description="Có thể chuyển sang table view hoặc card view; hiện đang ưu tiên card để review ảnh và trạng thái nhanh." />
            <div className="grid gap-4 md:grid-cols-2">
              {serviceItems.map((item) => (
                <article key={item.id} className="rounded-[22px] border border-[color:var(--line)] bg-white/65 p-4 shadow-[0_10px_24px_rgba(45,82,44,0.06)]">
                  <div className="aspect-[1.25] overflow-hidden rounded-[18px] bg-[linear-gradient(180deg,rgba(12,27,18,0.08),rgba(12,27,18,0.28))]">
                    {item.imagePath ? <img src={item.imagePath} alt={item.name} className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="mt-4 flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-[var(--forest-dark)]">{item.name}</div>
                      <div className="mt-1 text-sm text-[var(--muted)]">{item.category}</div>
                    </div>
                    <Badge tone={item.visible ? "success" : "warning"}>{item.visible ? "visible" : "hidden"}</Badge>
                  </div>
                  <div className="mt-3 text-sm font-semibold text-[var(--forest)]">{formatPriceLabel(item.priceLabel)}</div>
                  <div className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.description ?? "Chưa có mô tả."}</div>
                </article>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit xl:sticky xl:top-6">
          <CardContent>
            <SectionHeading title="Biểu mẫu dịch vụ" description="Khung này tương ứng luồng thêm/sửa/xóa/upload ảnh dịch vụ mà khách đã mô tả." />
            {selected ? (
              <div className="space-y-4">
                <form action={saveServiceAction} className="space-y-4">
                  <input type="hidden" name="id" value={selected.id} />
                  <div>
                    <FieldLabel>Tên dịch vụ</FieldLabel>
                    <Input name="name" defaultValue={selected.name} />
                  </div>
                  <div>
                    <FieldLabel>Slug</FieldLabel>
                    <Input name="slug" defaultValue={selected.slug} />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
                    <div>
                      <FieldLabel>Danh mục</FieldLabel>
                      <Select name="category" defaultValue={selected.category}>
                        <option value="BBQ">BBQ</option>
                        <option value="Cafe">Cafe</option>
                        <option value="Dịch vụ">Dịch vụ</option>
                      </Select>
                    </div>
                    <div>
                      <FieldLabel>Giá</FieldLabel>
                      <Input name="priceLabel" defaultValue={selected.priceLabel} />
                    </div>
                  </div>
                  <div>
                    <FieldLabel>Mô tả</FieldLabel>
                    <Textarea name="description" defaultValue={selected.description ?? ""} />
                  </div>
                  <div>
                    <FieldLabel>Đường dẫn ảnh</FieldLabel>
                    <Input name="imagePath" defaultValue={selected.imagePath ?? ""} placeholder="/uploads/service.jpg" />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
                    <div>
                      <FieldLabel>Trạng thái hiển thị</FieldLabel>
                      <Select name="visible" defaultValue={selected.visible ? "visible" : "hidden"}>
                        <option value="visible">Visible</option>
                        <option value="hidden">Hidden</option>
                      </Select>
                    </div>
                    <div>
                      <FieldLabel>Thứ tự hiển thị</FieldLabel>
                      <Input name="sortOrder" type="number" defaultValue={selected.sortOrder} />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button type="submit">
                      <Save className="h-4 w-4" />
                      Lưu dịch vụ
                    </Button>
                  </div>
                </form>
                <form action={deleteServiceAction}>
                  <input type="hidden" name="id" value={selected.id} />
                  <Button type="submit" variant="danger">Xóa dịch vụ</Button>
                </form>
              </div>
            ) : (
              <div className="rounded-[18px] bg-white/60 p-4 text-sm text-[var(--muted)]">
                Chưa có dịch vụ nào để chỉnh sửa.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
