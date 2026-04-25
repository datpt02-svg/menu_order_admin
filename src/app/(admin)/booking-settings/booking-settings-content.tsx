"use client";

import { Loader2, Save } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { saveBookingConfigAction } from "@/app/(admin)/actions";
import { SectionHeading } from "@/components/admin/section-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FieldError, FieldLabel, Input, Select } from "@/components/ui/field";

type BookingConfig = {
  depositAmount: number;
  bankName: string;
  bankCode: string;
  accountNumber: string;
};

type BankOption = {
  code: string;
  name: string;
};

type ActionValidationResult = {
  ok: boolean;
  fieldErrors?: Record<string, string>;
  formError?: string;
};

const BANK_OPTIONS: BankOption[] = [
  { code: "mbbank", name: "MB Bank" },
  { code: "vietcombank", name: "Vietcombank" },
  { code: "vietinbank", name: "VietinBank" },
  { code: "bidv", name: "BIDV" },
  { code: "agribank", name: "Agribank" },
  { code: "acb", name: "ACB" },
  { code: "tpbank", name: "TPBank" },
  { code: "techcombank", name: "Techcombank" },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function buildVietQrUrl({ bankCode, accountNumber, amount, addInfo }: { bankCode: string; accountNumber: string; amount: number; addInfo: string }) {
  if (!bankCode || !accountNumber || !Number.isFinite(amount) || amount < 1 || !addInfo) return null;
  const params = new URLSearchParams({
    amount: String(amount),
    addInfo,
  });
  return `https://img.vietqr.io/image/${bankCode}-${accountNumber}-compact2.png?${params.toString()}`;
}

export function BookingSettingsContent({ bookingConfig }: { bookingConfig: BookingConfig }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [previewAmount, setPreviewAmount] = useState(String(bookingConfig.depositAmount));
  const [previewBankCode, setPreviewBankCode] = useState(bookingConfig.bankCode);
  const [previewBankName, setPreviewBankName] = useState(bookingConfig.bankName);
  const [previewAccountNumber, setPreviewAccountNumber] = useState(bookingConfig.accountNumber);
  const formErrorRef = useRef<HTMLDivElement | null>(null);
  const selectedBank = BANK_OPTIONS.find((bank) => bank.code === previewBankCode) || null;
  const effectiveBankName = selectedBank?.name || previewBankName;
  const parsedAmount = Number(previewAmount);
  const displayAmount = Number.isFinite(parsedAmount) && parsedAmount > 0 ? `${formatCurrency(parsedAmount)}đ` : "--";
  const previewQrUrl = buildVietQrUrl({
    bankCode: previewBankCode,
    accountNumber: previewAccountNumber,
    amount: parsedAmount,
    addInfo: "SAM-AB12",
  });

  const hasError = (field: string) => Boolean(fieldErrors[field]);

  const clearFieldError = (field: string) => () => {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    setFormError(null);
    setSuccessMessage(null);
  };

  const onSave = async (formData: FormData) => {
    setFieldErrors({});
    setFormError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      try {
        const result = (await saveBookingConfigAction(formData)) as ActionValidationResult;
        if (!result.ok) {
          setFieldErrors(result.fieldErrors || {});
          setFormError(result.formError || null);
          formErrorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }

        setSuccessMessage("Đã lưu cấu hình chuyển khoản.");
        router.refresh();
      } catch {
        setFormError("Không thể lưu cấu hình chuyển khoản lúc này.");
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent>
          <SectionHeading
            title="Thông tin chuyển khoản"
            description="4 giá trị này sẽ hiển thị ở bước cọc của luồng booking. Nội dung chuyển khoản luôn là mã booking sinh tự động."
          />

          <form action={onSave} className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
            <div className="space-y-4">
              {formError && (
                <div ref={formErrorRef} className="rounded-[16px] border border-[rgba(159,75,62,0.18)] bg-[rgba(159,75,62,0.08)] px-4 py-3 text-sm text-[#8a3527]">
                  {formError}
                </div>
              )}
              {successMessage && !formError && (
                <div className="rounded-[16px] border border-[rgba(63,111,66,0.16)] bg-[rgba(63,111,66,0.08)] px-4 py-3 text-sm text-[var(--forest)]">
                  {successMessage}
                </div>
              )}

              <div>
                <FieldLabel>Số tiền cọc</FieldLabel>
                <Input
                  name="depositAmount"
                  type="number"
                  min={1}
                  defaultValue={bookingConfig.depositAmount}
                  invalid={hasError("depositAmount")}
                  onChange={(event) => {
                    setPreviewAmount(event.currentTarget.value);
                    clearFieldError("depositAmount")();
                  }}
                />
                <FieldError>{fieldErrors.depositAmount}</FieldError>
              </div>

              <div>
                <FieldLabel>Ngân hàng</FieldLabel>
                <Select
                  name="bankCode"
                  defaultValue={bookingConfig.bankCode}
                  invalid={hasError("bankName")}
                  onChange={(event) => {
                    const nextBank = BANK_OPTIONS.find((bank) => bank.code === event.currentTarget.value);
                    setPreviewBankCode(event.currentTarget.value);
                    setPreviewBankName(nextBank?.name || "");
                    clearFieldError("bankName")();
                  }}
                >
                  <option value="">Chọn ngân hàng</option>
                  {BANK_OPTIONS.map((bank) => (
                    <option key={bank.code} value={bank.code}>
                      {bank.name}
                    </option>
                  ))}
                </Select>
                <FieldError>{fieldErrors.bankName}</FieldError>
              </div>

              <div>
                <FieldLabel>Số tài khoản</FieldLabel>
                <Input
                  name="accountNumber"
                  defaultValue={bookingConfig.accountNumber}
                  invalid={hasError("accountNumber")}
                  onChange={(event) => {
                    setPreviewAccountNumber(event.currentTarget.value);
                    clearFieldError("accountNumber")();
                  }}
                />
                <FieldError>{fieldErrors.accountNumber}</FieldError>
              </div>

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={isPending}>
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Lưu cấu hình
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
                  <div className="flex items-center justify-between gap-3"><span>Số tài khoản</span><strong>{previewAccountNumber || "--"}</strong></div>
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
