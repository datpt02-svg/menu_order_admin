import { connection } from "next/server";

import { AdminShell } from "@/components/admin/admin-shell";
import { safeBookingConfig } from "@/lib/server/safe-data";
import { BookingSettingsContent } from "./booking-settings-content";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BookingSettingsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();

  const [{ data: bookingConfig }, resolvedSearchParams] = await Promise.all([
    safeBookingConfig(),
    searchParams,
  ]);
  const saved = resolvedSearchParams?.saved === "1";
  const error = resolvedSearchParams?.error === "1";
  const formError = typeof resolvedSearchParams?.formError === "string" ? resolvedSearchParams.formError : undefined;
  const fieldErrors = Object.fromEntries(
    Object.entries(resolvedSearchParams || {}).flatMap(([key, value]) => {
      if (!key.startsWith("field_") || typeof value !== "string") return [];
      return [[key.slice(6), value] as const];
    }),
  );

  return (
    <AdminShell
      pathname="/settings"
      title="Settings"
      description="Quản lý thông tin chuyển khoản và số điện thoại hiển thị ở luồng booking công khai."
    >
      <BookingSettingsContent bookingConfig={bookingConfig} saved={saved} error={error} formError={formError} fieldErrors={fieldErrors} />
    </AdminShell>
  );
}
