import { readFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";

const MENU_SOURCE_PATH = path.join(process.cwd(), "samcamping", "app.js");
const LOCALES = ["vi", "en", "zh", "ko", "ja"] as const;

type LocaleKey = (typeof LOCALES)[number];
type LocalizedText = Record<string, string>;

type SourceMenuItem = {
  id: string;
  name: LocalizedText;
  note: LocalizedText;
  description: LocalizedText;
  price: string;
  image: string;
};

type SourceMenuSection = {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  items: SourceMenuItem[];
};

type LocalizedOverrides = {
  sections?: Record<string, { title?: LocalizedText; description?: LocalizedText }>;
  itemNames?: Record<string, LocalizedText>;
};

const genericItemDescriptions: Record<string, LocalizedText> = {
  "khu-bbq": {
    vi: "Dịch vụ BBQ/camping nên đặt trước để SamCamping chuẩn bị khu vực phù hợp cho nhóm của mình.",
    en: "A BBQ/camping service that should be booked in advance so SamCamping can prepare the right area for your group.",
    zh: "建议提前预订的 BBQ/camping 服务，方便 SamCamping 为您的团队准备合适区域。",
    ko: "SamCamping이 그룹에 맞는 공간을 준비할 수 있도록 미리 예약하는 것이 좋은 BBQ/camping 서비스입니다.",
    ja: "SamCamping がグループに合うエリアを準備できるよう、事前予約がおすすめの BBQ/camping サービスです。",
  },
  "ca-phe": {
    vi: "Món cà phê dễ uống, phù hợp để bắt đầu buổi chill tại SamCamping.",
    en: "An easy coffee choice to start your chill time at SamCamping.",
    zh: "适合在 SamCamping 开始悠闲时光的咖啡选择。",
    ko: "SamCamping에서 여유로운 시간을 시작하기 좋은 커피 메뉴입니다.",
    ja: "SamCamping でゆったり過ごす時間の始まりに合うコーヒーです。",
  },
  "tra-cuc-sam-thi": {
    vi: "Trà cúc nhà Sam, hương nhẹ và dễ uống khi đi cùng món nướng hoặc ngồi chill.",
    en: "Sam's chrysanthemum tea with a light aroma, easy to enjoy with BBQ or while relaxing.",
    zh: "Sam 的菊花茶，香气轻柔，适合搭配烧烤或休闲小坐。",
    ko: "은은한 향의 Sam 국화차로 BBQ와 함께하거나 쉬면서 마시기 좋습니다.",
    ja: "Sam の菊花茶。軽やかな香りで、BBQ やリラックスタイムに合います。",
  },
  "do-uong-da-xay": {
    vi: "Đồ uống đá xay mát lạnh, vị rõ và dễ chọn cho ngày nóng.",
    en: "A cold blended drink with a clear flavor, easy to choose on hot days.",
    zh: "清凉冰沙饮品，风味明显，适合炎热天气。",
    ko: "더운 날에 고르기 좋은 시원한 블렌디드 음료입니다.",
    ja: "暑い日に選びやすい、冷たいブレンデッドドリンクです。",
  },
  "tra-sua-tra-trai-cay": {
    vi: "Đồ uống trà sữa hoặc trà trái cây dễ uống, hợp dùng cùng nhóm bạn.",
    en: "An easy milk tea or fruit tea choice for sharing with friends.",
    zh: "适合与朋友一起享用的奶茶或水果茶。",
    ko: "친구들과 함께 마시기 좋은 밀크티 또는 과일차입니다.",
    ja: "友人と一緒に楽しみやすいミルクティーまたはフルーツティーです。",
  },
  "xu-huong-moi": {
    vi: "Món đồ uống vị tươi, hợp khách thích trải nghiệm hương vị mới.",
    en: "A fresh-flavored drink for guests who enjoy trying something new.",
    zh: "口味清新的饮品，适合喜欢尝试新风味的客人。",
    ko: "새로운 맛을 즐기고 싶은 고객에게 어울리는 산뜻한 음료입니다.",
    ja: "新しい味を試したい方に合う、爽やかなドリンクです。",
  },
  "nhom-gia-dinh": {
    vi: "Lựa chọn dung tích lớn, phù hợp nhóm bạn hoặc gia đình dùng chung.",
    en: "A larger-size option for friends or families to share.",
    zh: "大容量选择，适合朋友或家庭分享。",
    ko: "친구나 가족이 함께 나눠 마시기 좋은 대용량 선택입니다.",
    ja: "友人や家族でシェアしやすい大容量の選択です。",
  },
  "tap-hoa-sam-thi": {
    vi: "Món tiện lợi trong tạp hóa Sam Thị, hỗ trợ trải nghiệm BBQ/camping đầy đủ hơn.",
    en: "A convenient Sam Thi grocery item that supports a fuller BBQ/camping experience.",
    zh: "Sam Thị 杂货铺的便利用品，让 BBQ/camping 体验更完整。",
    ko: "BBQ/camping 경험을 더 편하게 해주는 Sam Thị 잡화 아이템입니다.",
    ja: "BBQ/camping 体験をより便利にする Sam Thị グロッサリーアイテムです。",
  },
};

function extractConst(source: string, name: string) {
  const pattern = new RegExp(`(?:const|let)\\s+${name}\\s*=`, "m");
  const match = pattern.exec(source);
  if (!match) {
    throw new Error(`Missing constant: ${name}`);
  }

  let index = match.index + match[0].length;
  while (index < source.length && /\s/.test(source[index] || "")) index += 1;
  const start = index;
  const opening = source[start];
  const closing = opening === "[" ? "]" : opening === "{" ? "}" : null;
  if (!closing) {
    throw new Error(`Unsupported constant shape: ${name}`);
  }

  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let escaped = false;

  for (let cursor = start; cursor < source.length; cursor += 1) {
    const char = source[cursor];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (inSingle) {
      if (char === "'") inSingle = false;
      continue;
    }
    if (inDouble) {
      if (char === '"') inDouble = false;
      continue;
    }
    if (inTemplate) {
      if (char === "`") inTemplate = false;
      continue;
    }
    if (char === "'") {
      inSingle = true;
      continue;
    }
    if (char === '"') {
      inDouble = true;
      continue;
    }
    if (char === "`") {
      inTemplate = true;
      continue;
    }
    if (char === opening) depth += 1;
    if (char === closing) {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, cursor + 1);
      }
    }
  }

  throw new Error(`Unterminated constant: ${name}`);
}

function evaluateExpression<T>(expression: string, context: vm.Context) {
  return vm.runInContext(`(${expression})`, context) as T;
}

function cloneLocalizedText(input: LocalizedText | null | undefined) {
  const next: LocalizedText = {};
  for (const locale of LOCALES) {
    const value = input?.[locale];
    next[locale] = typeof value === "string" ? value : "";
  }
  return next;
}

function looksCorrupted(value: string | null | undefined) {
  if (typeof value !== "string") return true;
  const markers = ["?", "�", "â€", "áº", "á»", "Ä‘", "Ä"];
  return markers.some((marker) => value.includes(marker));
}

function normalizeMenuImagePath(imagePath: string) {
  if (imagePath.startsWith("./assets/")) {
    return imagePath.replace("./assets/", "/menu-assets/");
  }

  return imagePath;
}

function normalizeMenuData(sections: SourceMenuSection[], overrides: LocalizedOverrides) {
  return sections.map((section) => {
    const sectionOverride = overrides.sections?.[section.id];
    const normalizedSection: SourceMenuSection = {
      id: section.id,
      title: {
        ...cloneLocalizedText(section.title),
        ...cloneLocalizedText(sectionOverride?.title),
      },
      description: {
        ...cloneLocalizedText(section.description),
        ...cloneLocalizedText(sectionOverride?.description),
      },
      items: section.items.map((item) => {
        const genericDescription = genericItemDescriptions[section.id];
        const noteOverride = ["tra-cuc-nong", "tra-cuc-lanh", "tra-cuc-chua-ngot"].includes(item.id)
          ? {
              vi: "M 35,000 Đ | L 45,000 Đ",
              en: "M 35,000 Đ | L 45,000 Đ",
              zh: "M 35,000 Đ | L 45,000 Đ",
              ko: "M 35,000 Đ | L 45,000 Đ",
              ja: "M 35,000 Đ | L 45,000 Đ",
            }
          : null;

        const description = cloneLocalizedText(item.description);
        const note = {
          ...cloneLocalizedText(item.note),
          ...cloneLocalizedText(noteOverride),
        };
        const name = {
          ...cloneLocalizedText(item.name),
          ...cloneLocalizedText(overrides.itemNames?.[item.id]),
        };

        for (const locale of LOCALES) {
          if (genericDescription && looksCorrupted(description[locale])) {
            description[locale] = genericDescription[locale];
          }
          if (looksCorrupted(note[locale])) {
            note[locale] = note.en || "";
          }
        }

        return {
          id: item.id,
          name,
          note,
          description,
          price: item.price,
          image: normalizeMenuImagePath(item.image),
        } satisfies SourceMenuItem;
      }),
    };

    return normalizedSection;
  });
}

let cachedMenuSections: SourceMenuSection[] | null = null;

export async function loadMenuCatalogSource() {
  if (cachedMenuSections) {
    return cachedMenuSections.map((section) => ({
      ...section,
      title: { ...section.title },
      description: { ...section.description },
      items: section.items.map((item) => ({
        ...item,
        name: { ...item.name },
        note: { ...item.note },
        description: { ...item.description },
      })),
    }));
  }

  const source = await readFile(MENU_SOURCE_PATH, "utf8");
  const imageSetExpression = extractConst(source, "imageSet");
  const sectionsExpression = extractConst(source, "sections");
  const overridesExpression = extractConst(source, "localizedMenuOverrides");

  const context = vm.createContext({});
  const imageSet = evaluateExpression<Record<string, string>>(imageSetExpression, context);
  context.imageSet = imageSet;

  const sections = evaluateExpression<SourceMenuSection[]>(sectionsExpression, context);
  const overrides = evaluateExpression<LocalizedOverrides>(overridesExpression, context);

  cachedMenuSections = normalizeMenuData(sections, overrides);
  return loadMenuCatalogSource();
}

export function getMenuCatalogLocales() {
  return [...LOCALES];
}

export type { SourceMenuItem, SourceMenuSection, LocalizedText, LocaleKey };
