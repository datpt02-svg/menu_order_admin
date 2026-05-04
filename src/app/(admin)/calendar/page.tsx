import { CalendarRange, Download } from "lucide-react";

import { moveBookingAction, moveStaffAssignmentAction, saveStaffAssignmentAction, setStaffAssignmentStatusAction } from "@/app/(admin)/actions";
import { AdminShell } from "@/components/admin/admin-shell";
import { StaffCalendar } from "@/components/admin/staff-calendar";
import { Button } from "@/components/ui/button";
import { safeStaffWorkspace } from "@/lib/server/safe-data";

export default async function CalendarPage() {
  const { data } = await safeStaffWorkspace();

  return (
    <AdminShell
      pathname="/calendar"
      title="Calendar booking"
      description="Điều phối booking và nhân sự trên cùng một lịch, kéo thả trực tiếp để cập nhật khung giờ vận hành."
      actions={
        <>
          <Button variant="outline">
            <Download className="h-4 w-4" />
            Xuất tuần này
          </Button>
          <Button>
            <CalendarRange className="h-4 w-4" />
            Tạo lịch mới
          </Button>
        </>
      }
    >
      <StaffCalendar
        bookingList={data.bookingList.map((booking) => ({
          id: booking.id,
          code: booking.code,
          customerName: booking.customerName,
          customerPhone: booking.customerPhone,
          bookingDate: booking.bookingDate,
          bookingTime: booking.bookingTime,
          guestCount: booking.guestCount,
          status: booking.status,
          note: booking.note,
          zoneName: booking.zoneName ?? null,
          tableCode: booking.tableCode ?? null,
        }))}
        staffList={data.staffList.map((staff) => ({
          id: staff.id,
          code: staff.code,
          fullName: staff.fullName,
          phone: staff.phone,
          role: staff.role,
          status: staff.status,
          preferredZoneName: staff.preferredZoneName ?? null,
        }))}
        assignmentList={data.assignmentList.map((assignment) => ({
          id: assignment.id,
          staffMemberId: assignment.staffMemberId,
          staffShiftId: assignment.staffShiftId,
          assignmentRole: assignment.assignmentRole ?? null,
          status: assignment.status,
          notes: assignment.notes ?? null,
          shiftDate: assignment.shiftDate,
          startTime: assignment.startTime,
          endTime: assignment.endTime,
          shiftLabel: assignment.shiftLabel,
          shiftZoneName: assignment.shiftZoneName ?? null,
          staffCode: assignment.staffCode,
          staffFullName: assignment.staffFullName,
          staffPhone: assignment.staffPhone,
          staffRole: assignment.staffRole,
          staffStatus: assignment.staffStatus,
          staffPreferredZoneName: assignment.staffPreferredZoneName ?? null,
        }))}
        shiftList={data.shiftList.map((shift) => ({
          id: shift.id,
          shiftDate: shift.shiftDate,
          startTime: shift.startTime,
          endTime: shift.endTime,
          label: shift.label,
          zoneName: shift.zoneName ?? null,
          headcountRequired: shift.headcountRequired ?? null,
          notes: shift.notes ?? null,
        }))}
        zoneList={data.zoneList.map((zone) => ({
          id: zone.id,
          slug: zone.slug,
          name: zone.name,
        }))}
        staffingRecommendations={data.staffingRecommendations}
        assignmentConflicts={data.assignmentConflicts}
        usingFallback={false}
        moveBookingAction={moveBookingAction}
        moveStaffAssignmentAction={moveStaffAssignmentAction}
        saveStaffAssignmentAction={saveStaffAssignmentAction}
        setStaffAssignmentStatusAction={setStaffAssignmentStatusAction}
      />
    </AdminShell>
  );
}
