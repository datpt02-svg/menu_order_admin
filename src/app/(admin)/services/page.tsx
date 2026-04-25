import { AdminShell } from "@/components/admin/admin-shell";
import { safeServices, safeZones } from "@/lib/server/safe-data";
import { ServicesContent } from "./services-content";

export default async function ServicesPage() {
  const [{ data: serviceItems }, { data: zoneItems }] = await Promise.all([safeServices(), safeZones()]);

  return (
    <AdminShell
      pathname="/services"
      title="Quản lý dịch vụ"
      description="Quản lý thông tin, giá cả và hình ảnh các gói dịch vụ hiển thị trên ứng dụng khách."
    >
      <ServicesContent
        key={`${serviceItems.map((item) => `${item.id}:${item.sortOrder}`).join("|")}::${zoneItems.map((zone) => `${zone.id}:${zone.slug}`).join("|")}`}
        services={serviceItems}
        zones={zoneItems}
      />
    </AdminShell>
  );
}
