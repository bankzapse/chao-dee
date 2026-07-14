"use client";

import { PromptPayQR } from "@/components/promptpay-qr";
import { QRCodeImg } from "@/components/qr-code";
import { type BankInfo } from "@/components/bank-info";
import { formatBaht } from "@/lib/format";

export type PaymentMethod = "promptpay" | "bank";

/** ข้อความในคิวอาร์บัญชีธนาคาร (สแกนแล้วเห็นเลขบัญชีให้คัดลอกไปโอน) */
export function bankQrText(bank: BankInfo): string {
  const lines: string[] = [];
  if (bank.bank_name) lines.push(`ธนาคาร${bank.bank_name}`);
  if (bank.bank_account_no) lines.push(`เลขบัญชี ${bank.bank_account_no}`);
  if (bank.bank_account_name) lines.push(`ชื่อบัญชี ${bank.bank_account_name}`);
  return lines.join("\n");
}

/**
 * กล่องช่องทางชำระเงินตามวิธีที่เลือก (PromptPay หรือ บัญชีธนาคาร)
 * - promptpay → คิวอาร์พร้อมเพย์ (สแกนจ่ายได้ทันที)
 * - bank      → คิวอาร์เลขบัญชี (สแกนเพื่อดู/คัดลอกเลขบัญชีไปโอน)
 * ถ้าวิธีที่เลือกไม่มีข้อมูล จะสลับไปอีกวิธีที่มีให้อัตโนมัติ
 */
export function PaymentBox({
  method = "promptpay",
  promptpayId = "",
  bank,
  amount,
}: {
  method?: PaymentMethod;
  promptpayId?: string;
  bank?: BankInfo;
  amount?: number;
}) {
  const hasBank = Boolean(bank?.bank_account_no);
  const hasPP = Boolean(promptpayId);
  const useBank = method === "bank" ? hasBank : !hasPP && hasBank;

  if (useBank && bank) {
    return (
      <div className="flex flex-col items-center gap-2">
        <p className="text-xs font-medium text-slate-500">โอนเข้าบัญชีธนาคาร</p>
        <QRCodeImg text={bankQrText(bank)} size={168} />
        <div className="text-center">
          {bank.bank_name && <p className="text-sm font-medium text-slate-700">{bank.bank_name}</p>}
          <p className="text-lg font-bold tracking-wide text-slate-900">{bank.bank_account_no}</p>
          {bank.bank_account_name && <p className="text-xs text-slate-500">{bank.bank_account_name}</p>}
        </div>
        {amount ? <p className="text-base font-bold text-slate-900">{formatBaht(amount)}</p> : null}
        <p className="text-[11px] text-slate-400">สแกน QR เพื่อดู/คัดลอกเลขบัญชีไปโอน</p>
      </div>
    );
  }

  if (!hasPP && !hasBank) {
    return <p className="py-6 text-center text-xs text-slate-400">ยังไม่ได้ตั้งค่าช่องทางรับเงิน</p>;
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <PromptPayQR promptpayId={promptpayId} amount={amount} size={168} />
      {amount ? <p className="text-base font-bold text-slate-900">{formatBaht(amount)}</p> : null}
    </div>
  );
}
