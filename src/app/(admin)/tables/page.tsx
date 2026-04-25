import { Sparkles } from "lucide-react";

import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { tableStatus } from "@/data/mock-data";

import { TablesContent } from "./tables-content";

export default function TablesPage() {
  return (
    <AdminShell
      pathname="/tables"
      title="Bàn / Khu vực"
      description="Theo dõi công suất bàn, tình trạng đặt trước và các điểm cần chú ý trong từng zone của quán."
      actions={
        <Button>
          <Sparkles className="h-4 w-4" />
          Thêm bàn mới
        </Button>
      }
    >
      <TablesContent tables={tableStatus} />
    </AdminShell>
  );
}
