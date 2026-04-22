import { safeBookings, safeZones } from "@/lib/server/safe-data";
import { AdminShell } from "@/components/admin/admin-shell";
import { BookingContent } from "./booking-content";

export default async function BookingsPage() {
  const [{ data: bookingRows }, { data: zones }] = await Promise.all([
    safeBookings(), 
    safeZones()
  ]);

  return (
    <AdminShell
      pathname="/bookings"
      title="Quản lý booking"
      description="Theo dõi danh sách booking, lọc theo trạng thái/thời gian và xử lý chi tiết ngay trong các khối vận hành tập trung."
    >
      <BookingContent 
        initialData={{ 
          bookings: bookingRows, 
          zones: zones 
        }} 
      />
    </AdminShell>
  );
}
