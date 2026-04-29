import { AdminShell } from "@/components/admin/admin-shell";
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
