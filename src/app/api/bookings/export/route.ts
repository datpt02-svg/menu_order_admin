import ExcelJS from "exceljs";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  buildBookingExportFilename,
  getBookingFilterSummary,
  mapBookingToExportRow,
  parseBookingFilterInput,
} from "@/lib/bookings";
import { getFilteredBookings } from "@/lib/server/queries";

export const runtime = "nodejs";

const exportFilterSchema = z.object({
  keyword: z.string().optional().nullable(),
  date: z.string().optional().nullable(),
  status: z.enum(["all", "pending", "confirmed", "seated", "completed", "cancelled", "no_show"]).optional().nullable(),
  zone: z.string().optional().nullable(),
});

function buildWorkbook(rows: ReturnType<typeof mapBookingToExportRow>[], filterSummary: ReturnType<typeof getBookingFilterSummary>) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Claude Code";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Bookings");
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  worksheet.columns = [
    { header: "Mã booking", key: "code", width: 18 },
    { header: "Tên khách", key: "customerName", width: 28 },
    { header: "Số điện thoại", key: "customerPhone", width: 18 },
    { header: "Ngày", key: "bookingDate", width: 14 },
    { header: "Giờ", key: "bookingTime", width: 12 },
    { header: "Số khách", key: "guestCount", width: 12 },
    { header: "Trạng thái booking", key: "bookingStatus", width: 20 },
    { header: "Trạng thái bill cọc", key: "depositReviewStatus", width: 22 },
    { header: "Thời gian duyệt cọc", key: "depositReviewedAt", width: 22 },
    { header: "Ghi chú duyệt cọc", key: "depositReviewNote", width: 28 },
    { header: "Khu vực", key: "zoneName", width: 20 },
    { header: "Bàn", key: "tableCode", width: 16 },
    { header: "Ghi chú nội bộ", key: "note", width: 28 },
  ];

  worksheet.addRows(rows);
  worksheet.autoFilter = {
    from: "A1",
    to: "M1",
  };

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 22;

  worksheet.getColumn("guestCount").alignment = { horizontal: "center" };

  const metaSheet = workbook.addWorksheet("Thông tin xuất");
  if (metaSheet) {
    metaSheet.columns = [
      { header: "Thuộc tính", key: "label", width: 22 },
      { header: "Giá trị", key: "value", width: 42 },
    ];
    metaSheet.getRow(1).font = { bold: true };
    metaSheet.addRows([
      { label: "Thời gian xuất", value: new Date().toLocaleString("vi-VN") },
      { label: "Từ khóa", value: filterSummary.keyword },
      { label: "Ngày", value: filterSummary.date },
      { label: "Trạng thái", value: filterSummary.status },
      { label: "Khu vực", value: filterSummary.zone },
      { label: "Số dòng", value: String(rows.length) },
    ]);
  }

  return workbook;
}

export async function GET(request: NextRequest) {
  const filters = parseBookingFilterInput(request.nextUrl.searchParams);
  const parsed = exportFilterSchema.safeParse(filters);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid export filters", issues: parsed.error.issues }, { status: 400 });
  }

  const { bookings, zones } = await getFilteredBookings(parsed.data);
  const rows = bookings.map(mapBookingToExportRow);
  const workbook = buildWorkbook(rows, getBookingFilterSummary(parsed.data, zones));
  const buffer = await workbook.xlsx.writeBuffer();
  const filename = buildBookingExportFilename(parsed.data);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
