import { AdminShell } from "@/components/admin/admin-shell";
import { safeServices } from "@/lib/server/safe-data";
import { ServicesContent } from "./services-content";

export default async function ServicesPage() {
  const { data: serviceItems } = await safeServices();

  return (
    <AdminShell
      pathname="/services"
      title="Quản lý dịch vụ"
      description="Quản lý thông tin, giá cả và hình ảnh các gói dịch vụ hiển thị trên ứng dụng khách."
    >
      <ServicesContent key={serviceItems.map((item) => `${item.id}:${item.sortOrder}`).join("|")} services={serviceItems} />
    </AdminShell>
  );
}
