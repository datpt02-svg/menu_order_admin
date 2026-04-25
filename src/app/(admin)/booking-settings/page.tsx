import { AdminShell } from "@/components/admin/admin-shell";
import { safeBookingConfig } from "@/lib/server/safe-data";
import { BookingSettingsContent } from "./booking-settings-content";

export default async function BookingSettingsPage() {
  const { data: bookingConfig } = await safeBookingConfig();

  return (
    <AdminShell
      pathname="/booking-settings"
      title="Cấu hình chuyển khoản"
      description="Quản lý thông tin chuyển khoản hiển thị ở bước cọc của luồng booking công khai."
    >
      <BookingSettingsContent bookingConfig={bookingConfig} />
    </AdminShell>
  );
}
