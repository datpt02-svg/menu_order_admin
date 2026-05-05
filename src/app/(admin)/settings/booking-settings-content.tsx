import { Save } from "lucide-react";
import { redirect } from "next/navigation";

import { saveBookingConfigAction } from "@/app/(admin)/actions";
import { SectionHeading } from "@/components/admin/section-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FieldError, FieldLabel, Input } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { NumericInput } from "./numeric-input";

type BookingConfig = {
  depositAmount: number;
  bankName: string;
  bankCode: string;
  accountNumber: string;
  phone: string;
  wifiPassword: string;
} | null;

type BankOption = {
  code: string;
  name: string;
};

const BANK_OPTIONS: BankOption[] = [
  { code: "ICB", name: "VietinBank" },
  { code: "VCB", name: "Vietcombank" },
  { code: "BIDV", name: "BIDV" },
  { code: "VBA", name: "Agribank" },
  { code: "OCB", name: "OCB" },
  { code: "MB", name: "MBBank" },
  { code: "TCB", name: "Techcombank" },
  { code: "ACB", name: "ACB" },
  { code: "VPB", name: "VPBank" },
  { code: "TPB", name: "TPBank" },
  { code: "STB", name: "Sacombank" },
  { code: "HDB", name: "HDBank" },
  { code: "VCCB", name: "VietCapitalBank" },
  { code: "SCB", name: "SCB" },
  { code: "VIB", name: "VIB" },
  { code: "SHB", name: "SHB" },
  { code: "EIB", name: "Eximbank" },
  { code: "MSB", name: "MSB" },
  { code: "CAKE", name: "CAKE" },
  { code: "Ubank", name: "Ubank" },
  { code: "VTLMONEY", name: "ViettelMoney" },
  { code: "TIMO", name: "Timo" },
  { code: "VNPTMONEY", name: "VNPTMoney" },
  { code: "SGICB", name: "SaigonBank" },
  { code: "BAB", name: "BacABank" },
  { code: "momo", name: "MoMo" },
  { code: "PVDB", name: "PVcomBank Pay" },
  { code: "PVCB", name: "PVcomBank" },
  { code: "MBV", name: "MBV" },
  { code: "NCB", name: "NCB" },
  { code: "SHBVN", name: "ShinhanBank" },
  { code: "ABB", name: "ABBANK" },
  { code: "VAB", name: "VietABank" },
  { code: "NAB", name: "NamABank" },
  { code: "PGB", name: "PGBank" },
  { code: "VIETBANK", name: "VietBank" },
  { code: "BVB", name: "BaoVietBank" },
  { code: "SEAB", name: "SeABank" },
  { code: "COOPBANK", name: "COOPBANK" },
  { code: "LPB", name: "LPBank" },
  { code: "KLB", name: "KienLongBank" },
  { code: "KBank", name: "KBank" },
  { code: "MAFC", name: "MAFC" },
  { code: "HLBVN", name: "HongLeong" },
  { code: "KEBHANAHN", name: "KEBHANAHN" },
  { code: "KEBHANAHCM", name: "KEBHanaHCM" },
  { code: "CITIBANK", name: "Citibank" },
  { code: "CBB", name: "CBBank" },
  { code: "CIMB", name: "CIMB" },
  { code: "DBS", name: "DBSBank" },
  { code: "Vikki", name: "Vikki" },
  { code: "VBSP", name: "VBSP" },
  { code: "GPB", name: "GPBank" },
  { code: "KBHCM", name: "KookminHCM" },
  { code: "KBHN", name: "KookminHN" },
  { code: "WVN", name: "Woori" },
  { code: "VRB", name: "VRB" },
  { code: "HSBC", name: "HSBC" },
  { code: "IBK - HN", name: "IBKHN" },
  { code: "IBK - HCM", name: "IBKHCM" },
  { code: "IVB", name: "IndovinaBank" },
  { code: "UOB", name: "UnitedOverseas" },
  { code: "NHB HN", name: "Nonghyup" },
  { code: "SCVN", name: "StandardChartered" },
  { code: "PBVN", name: "PublicBank" },
];

const BANK_CODE_ALIASES: Record<string, string> = {
  mbbank: "MB",
  "mb bank": "MB",
  vietcombank: "VCB",
  vietinbank: "ICB",
  bidv: "BIDV",
  agribank: "VBA",
  acb: "ACB",
  tpbank: "TPB",
  techcombank: "TCB",
  shb: "SHB",
  ocb: "OCB",
  sacombank: "STB",
  hdbank: "HDB",
  msb: "MSB",
  vib: "VIB",
  vpbank: "VPB",
  eximbank: "EIB",
  pvcombank: "PVCB",
  "pvcombank pay": "PVDB",
  pvcombankpay: "PVDB",
  seabank: "SEAB",
  vietcapitalbank: "VCCB",
  vietabank: "VAB",
  vietbank: "VIETBANK",
  abbank: "ABB",
  bacabank: "BAB",
  baovietbank: "BVB",
  pgbank: "PGB",
  lpbank: "LPB",
  kienlongbank: "KLB",
  ncb: "NCB",
  namabank: "NAB",
  saigonbank: "SGICB",
  publicbank: "PBVN",
  standardchartered: "SCVN",
  shinhanbank: "SHBVN",
  hongleong: "HLBVN",
  indovinabank: "IVB",
  unitedoverseas: "UOB",
  nonghyup: "NHB HN",
  kookminhn: "KBHN",
  kookminhcm: "KBHCM",
  citibank: "CITIBANK",
  cbbank: "CBB",
  dbsbank: "DBS",
  woori: "WVN",
  gpbank: "GPB",
};

function normalizeBankCode(value: string) {
  const text = value.trim();
  return BANK_CODE_ALIASES[text.toLowerCase()] || text;
}

function resolveBankOption(bankCode: string, bankName: string) {
  const normalizedCode = normalizeBankCode(bankCode);
  const byCode = BANK_OPTIONS.find((bank) => bank.code === normalizedCode);
  if (byCode) return byCode;

  const normalizedName = bankName.trim().toLowerCase();
  const aliasCode = BANK_CODE_ALIASES[normalizedName];
  if (aliasCode) {
    const byAlias = BANK_OPTIONS.find((bank) => bank.code === aliasCode);
    if (byAlias) return byAlias;
  }

  return BANK_OPTIONS.find((bank) => bank.name.toLowerCase() === normalizedName) || null;
}

function getBankCodeValue(bankCode: string, bankName: string) {
  const resolved = resolveBankOption(bankCode, bankName);
  if (resolved) return resolved.code;
  return normalizeBankCode(bankCode) || bankCode.trim() || "";
}

function getBankNameValue(bankCode: string, bankName: string) {
  const resolved = resolveBankOption(bankCode, bankName);
  if (resolved) return resolved.name;
  return bankName.trim() || normalizeBankCode(bankCode) || "";
}

function buildCurrentBankOption(bankCode: string, bankName: string) {
  const code = getBankCodeValue(bankCode, bankName);
  const name = getBankNameValue(bankCode, bankName);
  if (!code || !name) return null;
  return { code, name };
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function buildVietQrUrl({ bankCode, accountNumber, amount, addInfo }: { bankCode: string; accountNumber: string; amount: number; addInfo: string }) {
  if (!bankCode || !accountNumber || !Number.isFinite(amount) || amount < 1 || !addInfo) return null;
  const params = new URLSearchParams({ amount: String(amount), addInfo });
  return `https://img.vietqr.io/image/${bankCode}-${accountNumber}-compact2.png?${params.toString()}`;
}

async function submitBookingConfig(formData: FormData) {
  "use server";

  const result = await saveBookingConfigAction(formData);
  if (!result.ok) {
    const params = new URLSearchParams();
    params.set("error", "1");
    if (result.formError) {
      params.set("formError", result.formError);
    }
    for (const [field, message] of Object.entries(result.fieldErrors || {})) {
      if (message) {
        params.set(`field_${field}`, message);
      }
    }
    redirect(`/settings?${params.toString()}`);
  }

  redirect("/settings?saved=1");
}

export function BookingSettingsContent({ bookingConfig, saved, error, formError, fieldErrors }: { bookingConfig: BookingConfig; saved?: boolean; error?: boolean; formError?: string; fieldErrors?: Record<string, string>; }) {
  const resolvedBookingConfig = bookingConfig || {
    depositAmount: 0,
    bankName: "",
    bankCode: "",
    accountNumber: "",
    phone: "",
    wifiPassword: "",
  };
  const currentBankOption = buildCurrentBankOption(resolvedBookingConfig.bankCode, resolvedBookingConfig.bankName);

  if (saved && error) {
    error = false;
  }
  const resolvedFormError = saved ? undefined : formError;
  const resolvedFieldErrors = saved ? {} : (fieldErrors || {});
  const hasError = (field: string) => Boolean(resolvedFieldErrors[field]);
  const bankOptions = currentBankOption && !BANK_OPTIONS.some((bank) => bank.code === currentBankOption.code)
    ? [currentBankOption, ...BANK_OPTIONS]
    : BANK_OPTIONS;
  const effectiveBankCode = currentBankOption?.code || getBankCodeValue(resolvedBookingConfig.bankCode, resolvedBookingConfig.bankName);
  const effectiveBankName = currentBankOption?.name || getBankNameValue(resolvedBookingConfig.bankCode, resolvedBookingConfig.bankName);
  const displayAmount = resolvedBookingConfig.depositAmount > 0 ? `${formatCurrency(resolvedBookingConfig.depositAmount)}đ` : "--";
  const previewQrUrl = buildVietQrUrl({
    bankCode: effectiveBankCode,
    accountNumber: resolvedBookingConfig.accountNumber,
    amount: resolvedBookingConfig.depositAmount,
    addInfo: "SAM-AB12",
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardContent>
          <SectionHeading
            title="Settings"
            description="Thông tin chuyển khoản và số điện thoại này sẽ hiển thị ở luồng booking public. Nội dung chuyển khoản luôn là mã booking sinh tự động."
          />
          {!bookingConfig ? (
            <div className="mb-4 rounded-[16px] border border-[color:var(--line)] bg-white/70 px-4 py-3 text-sm text-[var(--muted)]">
              Chưa có cấu hình booking. Điền thông tin bên dưới để bật hướng dẫn cọc cho khách.
            </div>
          ) : null}

          <form action={submitBookingConfig} className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
            <div className="space-y-4">
              {saved ? (
                <div className="rounded-[16px] border border-[rgba(63,111,66,0.16)] bg-[rgba(63,111,66,0.08)] px-4 py-3 text-sm text-[var(--forest)]">
                  Đã lưu settings.
                </div>
              ) : null}
              {error ? (
                <div className="rounded-[16px] border border-[rgba(159,75,62,0.18)] bg-[rgba(159,75,62,0.08)] px-4 py-3 text-sm text-[#8a3527]">
                  {resolvedFormError || "Không thể lưu settings lúc này."}
                </div>
              ) : null}
              <div>
                <FieldLabel>Số tiền cọc</FieldLabel>
                <Input name="depositAmount" type="number" inputMode="numeric" min={1} step={1} defaultValue={String(resolvedBookingConfig.depositAmount)} invalid={hasError("depositAmount")} />
                <FieldError>{resolvedFieldErrors.depositAmount}</FieldError>
              </div>

              <div>
                <FieldLabel>Ngân hàng</FieldLabel>
                <select
                  name="bankCode"
                  defaultValue={effectiveBankCode}
                  aria-invalid={hasError("bankName") || undefined}
                  className={cn(
                    "h-11 w-full rounded-[14px] border border-[color:var(--line)] bg-white/80 px-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--mint-deep)] focus:ring-2 focus:ring-[rgba(110,149,101,0.16)]",
                    hasError("bankName") && "border-[#c75b4a] focus:border-[#c75b4a] focus:ring-[rgba(199,91,74,0.18)]",
                  )}
                >
                  <option value="">Chọn ngân hàng</option>
                  {bankOptions.map((bank) => (
                    <option key={bank.code} value={bank.code}>
                      {bank.name}
                    </option>
                  ))}
                </select>
                <FieldError>{resolvedFieldErrors.bankName}</FieldError>
              </div>

              <div>
                <FieldLabel>Số tài khoản</FieldLabel>
                <NumericInput name="accountNumber" inputMode="numeric" pattern="[0-9]*" defaultValue={resolvedBookingConfig.accountNumber} invalid={hasError("accountNumber")} />
                <FieldError>{resolvedFieldErrors.accountNumber}</FieldError>
              </div>

              <div>
                <FieldLabel>Số điện thoại nhận cuộc gọi</FieldLabel>
                <NumericInput name="phone" type="tel" inputMode="numeric" pattern="[0-9]*" defaultValue={resolvedBookingConfig.phone} invalid={hasError("phone")} />
                <FieldError>{resolvedFieldErrors.phone}</FieldError>
              </div>

              <div className="rounded-[18px] border border-[var(--line)] bg-[rgba(244,251,240,0.5)] p-4">
                <div className="mb-3">
                  <div className="text-sm font-semibold text-[var(--forest-dark)]">Wi‑Fi</div>
                  <p className="text-xs text-[var(--muted)]">Mật khẩu này sẽ được dùng cho nút copy ở info modal của trang public.</p>
                </div>
                <div>
                  <FieldLabel>Mật khẩu Wi‑Fi</FieldLabel>
                  <Input name="wifiPassword" defaultValue={resolvedBookingConfig.wifiPassword} invalid={hasError("wifiPassword")} />
                  <FieldError>{resolvedFieldErrors.wifiPassword}</FieldError>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button type="submit">
                  <Save className="h-4 w-4" />
                  Lưu settings
                </Button>
                <p className="text-sm text-[var(--muted)]">Nội dung chuyển khoản sẽ luôn là mã booking, ví dụ `SAM-AB12`.</p>
              </div>
            </div>

            <Card className="bg-white/70">
              <CardContent className="space-y-4">
                <SectionHeading
                  title="Xem trước"
                  description="Cách thông tin này sẽ hiện ở bước cọc của khách."
                />
                <div className="space-y-3 rounded-[18px] border border-[var(--line)] bg-white/85 p-4 text-sm text-[var(--text)]">
                  <div className="flex items-center justify-between gap-3"><span>Số tiền cọc</span><strong>{displayAmount}</strong></div>
                  <div className="flex items-center justify-between gap-3"><span>Ngân hàng</span><strong>{effectiveBankName || "--"}</strong></div>
                  <div className="flex items-center justify-between gap-3"><span>Số tài khoản</span><strong>{resolvedBookingConfig.accountNumber || "--"}</strong></div>
                  <div className="flex items-center justify-between gap-3"><span>Số điện thoại</span><strong>{resolvedBookingConfig.phone || "--"}</strong></div>
                  <div className="flex items-center justify-between gap-3"><span>Wi‑Fi password</span><strong>{resolvedBookingConfig.wifiPassword || "--"}</strong></div>
                  <div className="flex items-center justify-between gap-3"><span>Nội dung</span><strong>SAM-AB12</strong></div>
                  {previewQrUrl ? (
                    <div className="space-y-3 rounded-[16px] border border-[var(--line)] bg-[rgba(244,251,240,0.7)] p-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--mint-deep)]">VietQR preview</div>
                      <img src={previewQrUrl} alt="VietQR preview" className="mx-auto h-56 w-56 rounded-[16px] border border-[var(--line)] bg-white p-2" />
                    </div>
                  ) : (
                    <div className="rounded-[16px] border border-dashed border-[var(--line)] px-4 py-3 text-xs text-[var(--muted)]">
                      Chọn ngân hàng hợp lệ và nhập đủ số tài khoản, số tiền để xem trước VietQR.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
