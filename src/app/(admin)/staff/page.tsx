import { UserCog } from "lucide-react";

import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { safeStaffPageData } from "@/lib/server/safe-data";
import { StaffContent } from "./staff-content";

export default async function StaffPage() {
  const {
    data: { staffList, shiftList, assignmentList, zoneList },
  } = await safeStaffPageData();

  return (
    <AdminShell
      pathname="/staff"
      title="Quản lý nhân viên"
      description="Quản lý dữ liệu nhân viên, ca làm và phân công tối thiểu để phục vụ điều phối thật trong calendar."
      actions={
        <>
          <Button variant="outline">
            <UserCog className="h-4 w-4" />
            Đồng bộ staffing
          </Button>
        </>
      }
    >
      <StaffContent 
        initialData={{ 
          staffList, 
          shiftList, 
          assignmentList, 
          zoneList 
        }} 
      />
    </AdminShell>
  );
}
