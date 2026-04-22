import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import {
  bookings,
  localeKeys,
  localeTranslations,
  services,
  tables,
  waiterRequests,
  zones,
} from "@/db/schema";

async function main() {
  const zoneValues = [
    { name: "BBQ Deck A", slug: "bbq-deck-a" },
    { name: "BBQ Deck B", slug: "bbq-deck-b" },
    { name: "Cafe Garden", slug: "cafe-garden" },
  ];

  for (const zone of zoneValues) {
    await db.insert(zones).values(zone).onConflictDoNothing();
  }

  const zoneRows = await db.select().from(zones);
  const zoneBySlug = Object.fromEntries(zoneRows.map((zone) => [zone.slug, zone]));

  const tableValues = [
    { code: "A-01", seats: 4, status: "available" as const, zoneId: zoneBySlug["bbq-deck-a"]?.id },
    { code: "A-03", seats: 4, status: "occupied" as const, zoneId: zoneBySlug["bbq-deck-a"]?.id },
    { code: "B-02", seats: 6, status: "reserved" as const, zoneId: zoneBySlug["bbq-deck-b"]?.id },
    { code: "C-08", seats: 2, status: "occupied" as const, zoneId: zoneBySlug["cafe-garden"]?.id },
    { code: "C-12", seats: 4, status: "cleaning" as const, zoneId: zoneBySlug["cafe-garden"]?.id },
  ];

  for (const table of tableValues) {
    await db.insert(tables).values(table).onConflictDoNothing();
  }

  const tableRows = await db.select().from(tables);
  const tableByCode = Object.fromEntries(tableRows.map((table) => [table.code, table]));

  const bookingValues = [
    {
      code: "BK-2104-001",
      customerName: "Nguyễn Anh Tú",
      customerPhone: "0901234567",
      bookingDate: "2026-04-21",
      bookingTime: "18:30",
      guestCount: 4,
      zoneId: zoneBySlug["bbq-deck-a"]?.id ?? null,
      tableId: tableByCode["A-03"]?.id ?? null,
      status: "confirmed" as const,
      note: "Sinh nhật, cần bàn gần view hồ.",
    },
    {
      code: "BK-2104-002",
      customerName: "Lê Minh Hằng",
      customerPhone: "0912345678",
      bookingDate: "2026-04-21",
      bookingTime: "19:00",
      guestCount: 2,
      zoneId: zoneBySlug["cafe-garden"]?.id ?? null,
      tableId: tableByCode["C-08"]?.id ?? null,
      status: "pending" as const,
      note: "Khách đi trễ 15 phút.",
    },
    {
      code: "BK-2104-003",
      customerName: "Trần Quốc Bảo",
      customerPhone: "0988777666",
      bookingDate: "2026-04-22",
      bookingTime: "20:00",
      guestCount: 6,
      zoneId: zoneBySlug["bbq-deck-b"]?.id ?? null,
      tableId: tableByCode["B-02"]?.id ?? null,
      status: "seated" as const,
      note: "Đã đặt combo nướng.",
    },
  ];

  for (const booking of bookingValues) {
    await db.insert(bookings).values(booking).onConflictDoNothing();
  }

  const waiterValues = [
    {
      code: "WR-001",
      tableId: tableByCode["A-03"]?.id ?? null,
      zoneId: zoneBySlug["bbq-deck-a"]?.id ?? null,
      need: "Thêm đá và chén bát",
      note: "Khách cần thêm 4 bộ chén",
      status: "new" as const,
    },
    {
      code: "WR-002",
      tableId: tableByCode["C-08"]?.id ?? null,
      zoneId: zoneBySlug["cafe-garden"]?.id ?? null,
      need: "Thanh toán",
      note: "Khách muốn xuất hóa đơn",
      status: "in_progress" as const,
    },
    {
      code: "WR-003",
      tableId: tableByCode["B-02"]?.id ?? null,
      zoneId: zoneBySlug["bbq-deck-b"]?.id ?? null,
      need: "Thêm than",
      note: "Bếp nướng yếu",
      status: "done" as const,
    },
  ];

  for (const request of waiterValues) {
    await db.insert(waiterRequests).values(request).onConflictDoNothing();
  }

  const serviceValues = [
    {
      name: "BBQ Combo 4 người",
      slug: "bbq-combo-4-nguoi",
      category: "BBQ",
      description: "Combo nướng phù hợp cho nhóm bạn hoặc gia đình nhỏ.",
      priceLabel: "699.000đ",
      imagePath: "/placeholder-service.jpg",
      visible: true,
      sortOrder: 1,
    },
    {
      name: "Cafe / Ngồi chill",
      slug: "cafe-ngoi-chill",
      category: "Cafe",
      description: "Không gian cafe thư giãn với lựa chọn đồ uống và bánh nhẹ.",
      priceLabel: "Tại menu",
      imagePath: "/placeholder-service.jpg",
      visible: true,
      sortOrder: 2,
    },
    {
      name: "Setup sinh nhật",
      slug: "setup-sinh-nhat",
      category: "Dịch vụ",
      description: "Dịch vụ setup bàn tiệc, trang trí và hỗ trợ chụp ảnh.",
      priceLabel: "Liên hệ",
      imagePath: "/placeholder-service.jpg",
      visible: false,
      sortOrder: 3,
    },
  ];

  for (const service of serviceValues) {
    await db.insert(services).values(service).onConflictDoNothing();
  }

  const localeKeyValues = [
    { namespace: "booking", key: "booking.pending.title", description: "Booking pending title" },
    { namespace: "waiter", key: "waiter.sent.title", description: "Waiter sent title" },
    { namespace: "services", key: "services.empty.description", description: "Empty services description" },
  ];

  for (const item of localeKeyValues) {
    await db.insert(localeKeys).values(item).onConflictDoNothing();
  }

  const localeKeyRows = await db.select().from(localeKeys);

  const localeTranslationsValues = [
    { key: "booking.pending.title", locale: "vi", value: "Chờ admin xác nhận" },
    { key: "booking.pending.title", locale: "en", value: "Waiting for admin confirmation" },
    { key: "booking.pending.title", locale: "ko", value: "관리자 확인 대기" },
    { key: "booking.pending.title", locale: "ja", value: "管理者の確認待ち" },
    { key: "waiter.sent.title", locale: "vi", value: "Yêu cầu đã gửi" },
    { key: "waiter.sent.title", locale: "en", value: "Request sent" },
    { key: "waiter.sent.title", locale: "ko", value: "요청 전송됨" },
    { key: "waiter.sent.title", locale: "ja", value: "送信済み" },
    { key: "services.empty.description", locale: "vi", value: "Chưa có dịch vụ nào đang hiển thị" },
    { key: "services.empty.description", locale: "en", value: "No visible services yet" },
  ];

  for (const item of localeTranslationsValues) {
    const localeKey = localeKeyRows.find((row) => row.key === item.key);
    if (!localeKey) continue;

    const existing = await db
      .select()
      .from(localeTranslations)
      .where(eq(localeTranslations.localeKeyId, localeKey.id));

    if (existing.some((row) => row.locale === item.locale)) continue;

    await db.insert(localeTranslations).values({
      localeKeyId: localeKey.id,
      locale: item.locale,
      value: item.value,
    });
  }

  console.log("Seed completed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
