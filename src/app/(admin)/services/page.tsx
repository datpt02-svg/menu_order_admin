import { ImagePlus } from "lucide-react";

import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { safeServices } from "@/lib/server/safe-data";
import { ServicesContent } from "./services-content";

export default async function ServicesPage() {
  const { data: serviceItems } = await safeServices();

  return (
    <AdminShell
      pathname="/services"
      title="Quản lý dịch vụ"
      description="Quản lý thông tin, giá cả và hình ảnh các gói dịch vụ hiển thị trên ứng dụng khách."
      actions={
        <a href="/api/upload">
          <Button variant="outline">
            <ImagePlus className="h-4 w-4" />
            Upload API
          </Button>
        </a>
      }
    >
      <ServicesContent services={serviceItems} />
    </AdminShell>
  );
}
