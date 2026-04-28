export const summaryCards = [
  {
    title: "Booking hôm nay",
    value: "26",
    change: "+8 booking",
    hint: "Tăng so với hôm qua",
  },
  {
    title: "Yêu cầu nhân viên",
    value: "12",
    change: "4 đang chờ",
    hint: "Có 2 bàn cần hỗ trợ gấp",
  },
  {
    title: "Bàn đang bận",
    value: "14/22",
    change: "63% công suất",
    hint: "BBQ zone đông khách",
  },
  {
    title: "Locales thiếu dịch",
    value: "18",
    change: "vi / en / ko / ja",
    hint: "Ưu tiên module booking",
  },
] as const;

export const bookingRows = [
  {
    id: "BK-2104-001",
    guest: "Nguyễn Anh Tú",
    phone: "0901234567",
    date: "2026-04-21",
    time: "18:30",
    guests: 4,
    zone: "BBQ Deck A",
    table: "A-03",
    status: "confirmed",
    note: "Sinh nhật, cần bàn gần view hồ.",
  },
  {
    id: "BK-2104-002",
    guest: "Lê Minh Hằng",
    phone: "0912345678",
    date: "2026-04-21",
    time: "19:00",
    guests: 2,
    zone: "Cafe Garden",
    table: "C-08",
    status: "pending",
    note: "Khách đi trễ 15 phút.",
  },
  {
    id: "BK-2104-003",
    guest: "Trần Quốc Bảo",
    phone: "0988777666",
    date: "2026-04-22",
    time: "20:00",
    guests: 6,
    zone: "BBQ Deck B",
    table: "B-02",
    status: "seated",
    note: "Đã đặt combo nướng.",
  },
] as const;

export const waiterRequests = [
  {
    id: "WR-001",
    table: "A-03",
    zone: "BBQ Deck A",
    need: "Thêm đá và chén bát",
    note: "Khách cần thêm 4 bộ chén",
    status: "new",
    createdAt: "18:32",
  },
  {
    id: "WR-002",
    table: "C-08",
    zone: "Cafe Garden",
    need: "Thanh toán",
    note: "Khách muốn xuất hóa đơn",
    status: "in_progress",
    createdAt: "18:10",
  },
  {
    id: "WR-003",
    table: "B-02",
    zone: "BBQ Deck B",
    need: "Thêm than",
    note: "Bếp nướng yếu",
    status: "done",
    createdAt: "17:55",
  },
] as const;

export const tableStatus = [
  {
    id: "A-01",
    zone: "BBQ Deck A",
    status: "available",
    seats: 4,
    layout: { x: 24, y: 24, width: 132, height: 82, shape: "rect" },
  },
  {
    id: "A-03",
    zone: "BBQ Deck A",
    status: "occupied",
    seats: 4,
    layout: { x: 182, y: 118, width: 132, height: 82, shape: "rect" },
  },
  {
    id: "B-02",
    zone: "BBQ Deck B",
    status: "reserved",
    seats: 6,
    layout: { x: 92, y: 42, width: 132, height: 82, shape: "rect" },
  },
  {
    id: "C-08",
    zone: "Cafe Garden",
    status: "occupied",
    seats: 2,
    layout: { x: 34, y: 28, width: 132, height: 82, shape: "rect" },
  },
  {
    id: "C-12",
    zone: "Cafe Garden",
    status: "cleaning",
    seats: 4,
    layout: { x: 190, y: 136, width: 132, height: 82, shape: "rect" },
  },
] as const;

export const serviceItems = [
  {
    id: "SV-001",
    name: "BBQ Combo 4 người",
    category: "BBQ",
    price: "699.000đ",
    visible: true,
    image: "/placeholder-service.jpg",
  },
  {
    id: "SV-002",
    name: "Cafe / Ngồi chill",
    category: "Cafe",
    price: "Tại menu",
    visible: true,
    image: "/placeholder-service.jpg",
  },
  {
    id: "SV-003",
    name: "Setup sinh nhật",
    category: "Dịch vụ",
    price: "Liên hệ",
    visible: false,
    image: "/placeholder-service.jpg",
  },
] as const;

export const localeRows = [
  {
    key: "booking.pending.title",
    namespace: "booking",
    vi: "Chờ admin xác nhận",
    en: "Waiting for admin confirmation",
    ko: "관리자 확인 대기",
    ja: "管理者の確認待ち",
    missing: 0,
  },
  {
    key: "waiter.sent.title",
    namespace: "waiter",
    vi: "Yêu cầu đã gửi",
    en: "Request sent",
    ko: "요청 전송됨",
    ja: "送信済み",
    missing: 0,
  },
  {
    key: "services.empty.description",
    namespace: "services",
    vi: "Chưa có dịch vụ nào đang hiển thị",
    en: "No visible services yet",
    ko: "",
    ja: "",
    missing: 2,
  },
] as const;

export const upcomingTimeline = [
  {
    time: "18:30",
    title: "Nguyễn Anh Tú - BBQ Deck A / A-03",
    detail: "4 khách · đã xác nhận · cần view hồ",
  },
  {
    time: "19:00",
    title: "Lê Minh Hằng - Cafe Garden / C-08",
    detail: "2 khách · chờ xác nhận bill",
  },
  {
    time: "20:00",
    title: "Trần Quốc Bảo - BBQ Deck B / B-02",
    detail: "6 khách · đã check-in",
  },
] as const;
