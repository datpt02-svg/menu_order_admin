import { desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import {
  bookings,
  services,
  tables,
  waiterRequests,
  zones,
} from "@/db/schema";
import type { BookingRow, ServiceRow, TableRow, WaiterRow, ZoneRow } from "@/lib/server/serializers";

export async function getZones(): Promise<ZoneRow[]> {
  return db.select().from(zones).orderBy(zones.name);
}

export async function getBookings(): Promise<BookingRow[]> {
  const rows = await db
    .select({
      id: bookings.id,
      code: bookings.code,
      customerName: bookings.customerName,
      customerPhone: bookings.customerPhone,
      bookingDate: bookings.bookingDate,
      bookingTime: bookings.bookingTime,
      guestCount: bookings.guestCount,
      zoneId: bookings.zoneId,
      tableId: bookings.tableId,
      status: bookings.status,
      note: bookings.note,
      createdAt: bookings.createdAt,
      updatedAt: bookings.updatedAt,
      zoneName: zones.name,
      tableCode: tables.code,
    })
    .from(bookings)
    .leftJoin(zones, eq(bookings.zoneId, zones.id))
    .leftJoin(tables, eq(bookings.tableId, tables.id))
    .orderBy(desc(bookings.bookingDate), desc(bookings.bookingTime));

  return rows satisfies BookingRow[];
}

export async function getWaiterRequests(): Promise<WaiterRow[]> {
  const rows = await db
    .select({
      id: waiterRequests.id,
      code: waiterRequests.code,
      tableId: waiterRequests.tableId,
      zoneId: waiterRequests.zoneId,
      need: waiterRequests.need,
      note: waiterRequests.note,
      status: waiterRequests.status,
      createdAt: waiterRequests.createdAt,
      updatedAt: waiterRequests.updatedAt,
      zoneName: zones.name,
      tableCode: tables.code,
    })
    .from(waiterRequests)
    .leftJoin(zones, eq(waiterRequests.zoneId, zones.id))
    .leftJoin(tables, eq(waiterRequests.tableId, tables.id))
    .orderBy(desc(waiterRequests.createdAt));

  return rows satisfies WaiterRow[];
}

export async function getTables(): Promise<TableRow[]> {
  const rows = await db
    .select({
      id: tables.id,
      code: tables.code,
      zoneId: tables.zoneId,
      seats: tables.seats,
      status: tables.status,
      createdAt: tables.createdAt,
      zoneName: zones.name,
    })
    .from(tables)
    .leftJoin(zones, eq(tables.zoneId, zones.id))
    .orderBy(tables.code);

  return rows satisfies TableRow[];
}

export async function getServices(): Promise<ServiceRow[]> {
  return db.select().from(services).orderBy(services.sortOrder, services.name);
}


export async function getDashboardSnapshot() {
  const [bookingList, waiterList, tableList] = await Promise.all([
    getBookings(),
    getWaiterRequests(),
    getTables(),
  ]);

  const today = new Date().toISOString().slice(0, 10);

  return {
    bookingList,
    waiterList,
    tableList,
    stats: {
      bookingsToday: bookingList.filter((booking) => booking.bookingDate === today).length,
      waiterOpen: waiterList.filter((item) => item.status !== "done").length,
      occupiedTables: tableList.filter((table) => table.status === "occupied").length,
    },
  };
}
