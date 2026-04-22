import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import {
  bookings,
  localeKeys,
  localeTranslations,
  services,
  staffAssignmentEvents,
  staffAssignments,
  staffMembers,
  staffShifts,
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

  const staffMemberValues = [
    {
      code: "ST-001",
      fullName: "Phạm Thu Trang",
      phone: "0909001001",
      role: "manager" as const,
      status: "active" as const,
      preferredZoneId: zoneBySlug["bbq-deck-a"]?.id ?? null,
      notes: "Phụ trách ca tối và xử lý booking đông khách.",
    },
    {
      code: "ST-002",
      fullName: "Ngô Minh Quân",
      phone: "0909001002",
      role: "service" as const,
      status: "active" as const,
      preferredZoneId: zoneBySlug["bbq-deck-a"]?.id ?? null,
      notes: "Ưu tiên khu BBQ Deck A, mạnh xử lý nhóm đông.",
    },
    {
      code: "ST-003",
      fullName: "Trần Mỹ Linh",
      phone: "0909001003",
      role: "service" as const,
      status: "active" as const,
      preferredZoneId: zoneBySlug["cafe-garden"]?.id ?? null,
      notes: "Theo dõi khu cafe và hỗ trợ khách lẻ.",
    },
    {
      code: "ST-004",
      fullName: "Lý Hoàng Phúc",
      phone: "0909001004",
      role: "kitchen" as const,
      status: "active" as const,
      preferredZoneId: null,
      notes: "Phụ trách line nướng giờ cao điểm.",
    },
    {
      code: "ST-005",
      fullName: "Bùi Thanh Hà",
      phone: "0909001005",
      role: "cashier" as const,
      status: "active" as const,
      preferredZoneId: null,
      notes: "Cuối tuần hỗ trợ thanh toán và hóa đơn.",
    },
    {
      code: "ST-006",
      fullName: "Đỗ Gia Hân",
      phone: "0909001006",
      role: "support" as const,
      status: "inactive" as const,
      preferredZoneId: zoneBySlug["bbq-deck-b"]?.id ?? null,
      notes: "Tạm nghỉ tuần này.",
    },
  ];

  for (const staffMember of staffMemberValues) {
    await db.insert(staffMembers).values(staffMember).onConflictDoNothing();
  }

  const staffMemberRows = await db.select().from(staffMembers);
  const staffByCode = Object.fromEntries(staffMemberRows.map((member) => [member.code, member]));

  const staffShiftValues = [
    {
      shiftDate: "2026-04-22",
      startTime: "17:00",
      endTime: "21:00",
      label: "Ca tối BBQ Deck A",
      zoneId: zoneBySlug["bbq-deck-a"]?.id ?? null,
      headcountRequired: 2,
      notes: "Ưu tiên khách đặt bàn sinh nhật và nhóm đông.",
    },
    {
      shiftDate: "2026-04-22",
      startTime: "17:30",
      endTime: "21:30",
      label: "Ca tối Cafe Garden",
      zoneId: zoneBySlug["cafe-garden"]?.id ?? null,
      headcountRequired: 1,
      notes: "Theo dõi khách đặt bàn cặp đôi và khu cafe.",
    },
    {
      shiftDate: "2026-04-22",
      startTime: "18:00",
      endTime: "22:00",
      label: "Line bếp peak tối",
      zoneId: null,
      headcountRequired: 1,
      notes: "Chuẩn bị combo nướng cho slot 19h-20h30.",
    },
    {
      shiftDate: "2026-04-23",
      startTime: "16:30",
      endTime: "20:30",
      label: "Ca chiều BBQ Deck B",
      zoneId: zoneBySlug["bbq-deck-b"]?.id ?? null,
      headcountRequired: 1,
      notes: "Theo dõi bàn đặt trước cuối tuần sớm.",
    },
  ];

  for (const shift of staffShiftValues) {
    await db.insert(staffShifts).values(shift);
  }

  const staffShiftRows = await db.select().from(staffShifts);
  const shiftByLabel = Object.fromEntries(staffShiftRows.map((shift) => [`${shift.shiftDate}-${shift.label}`, shift]));

  const staffAssignmentValues = [
    {
      staffMemberId: staffByCode["ST-001"]?.id,
      staffShiftId: shiftByLabel["2026-04-22-Ca tối BBQ Deck A"]?.id,
      zoneId: zoneBySlug["bbq-deck-a"]?.id ?? null,
      assignmentRole: "manager" as const,
      status: "confirmed" as const,
      notes: "Giữ vai trò điều phối khu nướng.",
    },
    {
      staffMemberId: staffByCode["ST-002"]?.id,
      staffShiftId: shiftByLabel["2026-04-22-Ca tối BBQ Deck A"]?.id,
      zoneId: zoneBySlug["bbq-deck-a"]?.id ?? null,
      assignmentRole: "service" as const,
      status: "assigned" as const,
      notes: "Phụ trách các bàn 4-6 khách.",
    },
    {
      staffMemberId: staffByCode["ST-003"]?.id,
      staffShiftId: shiftByLabel["2026-04-22-Ca tối Cafe Garden"]?.id,
      zoneId: zoneBySlug["cafe-garden"]?.id ?? null,
      assignmentRole: "service" as const,
      status: "confirmed" as const,
      notes: "Ưu tiên bàn cặp đôi và khách đến sớm.",
    },
    {
      staffMemberId: staffByCode["ST-004"]?.id,
      staffShiftId: shiftByLabel["2026-04-22-Line bếp peak tối"]?.id,
      zoneId: null,
      assignmentRole: "kitchen" as const,
      status: "assigned" as const,
      notes: "Chuẩn bị combo nướng và món thêm.",
    },
  ].filter((assignment) => assignment.staffMemberId && assignment.staffShiftId);

  for (const assignment of staffAssignmentValues) {
    await db.insert(staffAssignments).values(assignment);
  }

  const staffAssignmentRows = await db.select().from(staffAssignments);

  for (const assignment of staffAssignmentRows) {
    await db.insert(staffAssignmentEvents).values({
      staffAssignmentId: assignment.id,
      eventType: "created",
      payload: { source: "seed" },
    });
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
