import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import {
  bookingConfigs,
  menuItems,
  menuSections,
  services,
  zones,
} from "@/db/schema";
import { loadMenuCatalogSource } from "@/lib/server/menu-catalog-source";

async function main() {
  const zoneValues = [
    { name: "BBQ Deck A", slug: "bbq-deck-a" },
    { name: "BBQ Deck B", slug: "bbq-deck-b" },
    { name: "Cafe Garden", slug: "cafe-garden" },
  ];

  for (const zone of zoneValues) {
    await db.insert(zones).values(zone).onConflictDoNothing();
  }

  const bookingConfigRows = await db.select({ id: bookingConfigs.id }).from(bookingConfigs).limit(1);
  if (!bookingConfigRows[0]) {
    await db.insert(bookingConfigs).values({
      depositAmount: 100000,
      bankName: "MBBank",
      bankCode: "mbbank",
      accountNumber: "09680881",
      phone: "09680881",
    });
  }

  const serviceValues = [
    {
      name: "CAFE / NGỒI CHILL",
      slug: "cafe-chill",
      category: "Cafe",
      description: "Đặt bàn cơ bản cho khách đến uống cà phê, thư giãn và gặp gỡ.",
      priceLabel: "Không cọc riêng",
      priceLabelI18n: {
        vi: "Không cọc riêng",
        en: "Basic booking",
        zh: "基础预订",
        ko: "기본 예약",
        ja: "通常予約",
      },
      nameI18n: {
        vi: "CAFE / NGỒI CHILL",
        en: "CAFE / CHILL SEATING",
        zh: "CAFE / 休闲座位",
        ko: "CAFE / 칠 좌석",
        ja: "CAFE / チルシート",
      },
      descriptionI18n: {
        vi: "Đặt bàn cơ bản cho khách đến uống cà phê, thư giãn và gặp gỡ.",
        en: "Basic table booking for coffee, relaxing, and casual gatherings.",
        zh: "适合来喝咖啡、放松和轻松聚会的基础订位。",
        ko: "커피를 마시고 쉬거나 가볍게 모임을 즐기기 위한 기본 좌석 예약입니다.",
        ja: "コーヒー、リラックス、気軽な集まり向けの基本席予約です。",
      },
      imagePath: "/placeholder-service.jpg",
      visible: true,
      bookingEnabled: true,
      zoneSlug: "cafe-garden",
      sortOrder: 0,
    },
    {
      name: "DỊCH VỤ KHU VỰC BẾP CỦA BẠN",
      slug: "khu-vuc-bep-cua-ban",
      category: "BBQ",
      description: "Dịch vụ BBQ/camping nên đặt trước để SamCamping chuẩn bị khu vực phù hợp cho nhóm của mình.",
      priceLabel: "1.080K",
      priceLabelI18n: {
        vi: "1.080K",
        en: "1,080K",
        zh: "1,080K",
        ko: "1,080K",
        ja: "1,080K",
      },
      nameI18n: {
        vi: "DỊCH VỤ KHU VỰC BẾP CỦA BẠN",
        en: "YOUR PRIVATE BBQ KITCHEN AREA",
        zh: "专属 BBQ 厨房区服务",
        ko: "프라이빗 BBQ 키친 구역 서비스",
        ja: "専用 BBQ キッチンエリアサービス",
      },
      descriptionI18n: {
        vi: "Dịch vụ BBQ/camping nên đặt trước để SamCamping chuẩn bị khu vực phù hợp cho nhóm của mình.",
        en: "Signature BBQ/camping service that should be booked in advance so SamCamping can prepare the right area for your group.",
        zh: "建议提前预订的 BBQ/camping 服务，方便 SamCamping 为您的团队准备合适区域。",
        ko: "SamCamping이 그룹에 맞는 구역을 준비할 수 있도록 미리 예약하는 BBQ/camping 서비스입니다.",
        ja: "SamCamping がグループに合うエリアを準備できるよう、事前予約がおすすめの BBQ/camping サービスです。",
      },
      imagePath: "/placeholder-service.jpg",
      visible: true,
      bookingEnabled: true,
      zoneSlug: "bbq-deck-a",
      sortOrder: 1,
    },
  ];

  for (const service of serviceValues) {
    await db.insert(services).values(service).onConflictDoNothing();
  }

  const sourceSections = await loadMenuCatalogSource();

  for (const [index, section] of sourceSections.entries()) {
    await db.insert(menuSections).values({
      slug: section.id,
      titleI18n: section.title,
      descriptionI18n: section.description,
      visible: true,
      sortOrder: index + 1,
    }).onConflictDoNothing();
  }

  const sectionRows = await db.select({ id: menuSections.id, slug: menuSections.slug }).from(menuSections);
  const sectionBySlug = Object.fromEntries(sectionRows.map((section) => [section.slug, section.id]));

  for (const section of sourceSections) {
    const sectionId = sectionBySlug[section.id];
    if (!sectionId) continue;

    for (const [index, item] of section.items.entries()) {
      const existing = await db.select({ id: menuItems.id }).from(menuItems).where(eq(menuItems.slug, item.id)).limit(1);
      if (existing[0]) continue;

      await db.insert(menuItems).values({
        sectionId,
        slug: item.id,
        nameI18n: item.name,
        noteI18n: item.note,
        descriptionI18n: item.description,
        priceLabel: item.price,
        imagePath: item.image,
        visible: true,
        sortOrder: index + 1,
      });
    }
  }

  console.log("Seed completed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});