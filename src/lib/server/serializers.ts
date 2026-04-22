import type { bookings, localeKeys, localeTranslations, services, tables, waiterRequests, zones } from "@/db/schema";

export type BookingRow = typeof bookings.$inferSelect & {
  zoneName?: string | null;
  tableCode?: string | null;
};

export type WaiterRow = typeof waiterRequests.$inferSelect & {
  zoneName?: string | null;
  tableCode?: string | null;
};

export type TableRow = typeof tables.$inferSelect & {
  zoneName?: string | null;
};

export type ServiceRow = typeof services.$inferSelect;

export type LocaleRow = {
  id: number;
  key: string;
  namespace: string;
  description: string | null;
  deprecated: boolean;
  translations: Record<string, string>;
  missing: number;
};

export type ZoneRow = typeof zones.$inferSelect;
