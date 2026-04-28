import { AdminShell } from "@/components/admin/admin-shell";
import { safeMenuSections } from "@/lib/server/safe-data";
import { MenuContent } from "./menu-content";

export default async function MenuPage() {
  const { data: sections } = await safeMenuSections();

  return (
    <AdminShell
      pathname="/menu"
      title="Quản lý menu món"
      description="Đồng bộ và quản trị toàn bộ menu hiển thị ở giao diện user mà không ảnh hưởng flow booking dịch vụ hiện tại."
    >
      <MenuContent sections={sections} />
    </AdminShell>
  );
}
