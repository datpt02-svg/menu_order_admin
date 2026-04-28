import { AdminShell } from "@/components/admin/admin-shell";
import { safeTables, safeZones } from "@/lib/server/safe-data";

import { TablesContent } from "./tables-content";

export default async function TablesPage() {
  const [{ data: tableRows }, { data: zoneRows }] = await Promise.all([safeTables(), safeZones()]);

  return (
    <AdminShell
      pathname="/tables"
      title="Bàn / Khu vực"
      description="Theo dõi công suất bàn, tình trạng đặt trước và các điểm cần chú ý trong từng zone của quán."
    >
      <TablesContent
        key={`${tableRows.map((item) => `${item.id}:${item.code}:${item.status}:${item.zoneId ?? "none"}`).join("|")}::${zoneRows.map((zone) => `${zone.id}:${zone.slug}:${zone.name}`).join("|")}`}
        tables={tableRows}
        zones={zoneRows}
      />
    </AdminShell>
  );
}
