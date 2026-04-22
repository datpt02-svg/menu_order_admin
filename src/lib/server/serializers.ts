import type {
  bookings,
  services,
  staffAssignments,
  staffMembers,
  staffShifts,
  tables,
  waiterRequests,
  zones,
} from "@/db/schema";

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

export type StaffMemberRow = typeof staffMembers.$inferSelect & {
  preferredZoneName?: string | null;
};

export type StaffShiftRow = typeof staffShifts.$inferSelect & {
  zoneName?: string | null;
};

export type StaffAssignmentRow = typeof staffAssignments.$inferSelect & {
  shiftDate: string;
  startTime: string;
  endTime: string;
  shiftLabel: string;
  shiftZoneId: number | null;
  shiftZoneName?: string | null;
  staffCode: string;
  staffFullName: string;
  staffPhone: string;
  staffRole: typeof staffMembers.$inferSelect.role;
  staffStatus: typeof staffMembers.$inferSelect.status;
  staffPreferredZoneId: number | null;
  staffPreferredZoneName?: string | null;
};

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
