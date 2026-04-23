import { unstable_noStore as noStore } from "next/cache";

import { safeBookings, safeZones } from "@/lib/server/safe-data";
import { AdminShell } from "@/components/admin/admin-shell";
import { BookingContent } from "./booking-content";

type PageSearchParams = Record<string, string | string[] | undefined>;

export default async function BookingsPage({
  searchParams,
}: {
  searchParams?: Promise<PageSearchParams>;
}) {
  noStore();
  const [{ data: bookingRows }, { data: zones }, resolvedSearchParams] = await Promise.all([
    safeBookings(),
    safeZones(),
    searchParams ?? Promise.resolve<PageSearchParams>({}),
  ]);
  const bookingIdParam = resolvedSearchParams.bookingId;
  const highlightedBookingId = Array.isArray(bookingIdParam)
    ? Number(bookingIdParam[0])
    : Number(bookingIdParam);

  return (
    <AdminShell
      pathname="/bookings"
      title="Quản lý booking"
      description="Theo dõi danh sách booking, lọc theo trạng thái/thời gian và xử lý chi tiết ngay trong các khối vận hành tập trung."
    >
      <BookingContent
        initialData={{
          bookings: bookingRows,
          zones,
        }}
        highlightedBookingId={Number.isFinite(highlightedBookingId) ? highlightedBookingId : undefined}
      />
    </AdminShell>
  );
}
