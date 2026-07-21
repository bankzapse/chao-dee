"use client";

import { useState } from "react";
import { PromptPayQR } from "@/components/promptpay-qr";
import { type BankInfo } from "@/components/bank-info";
import { formatBaht } from "@/lib/format";

export type PaymentMethod = "promptpay" | "bank";

/** ปุ่มคัดลอกเลขบัญชี (ซ่อนตอนพิมพ์) */
function CopyButton({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="no-print rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value.replace(/\D/g, ""));
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* เบราว์เซอร์ไม่อนุญาต — ผู้ใช้กดคัดลอกเองได้ */
        }
      }}
    >
      {done ? "✓ คัดลอกแล้ว" : "คัดลอกเลขบัญชี"}
    </button>
  );
}

/** กล่องเลขบัญชีธนาคารสำหรับโอนเอง */
function BankTransferDetails({ bank, amount }: { bank: BankInfo; amount?: number }) {
  return (
    <div className="w-full text-center">
      <p className="text-xs font-medium text-slate-500">โอนเข้าบัญชีธนาคาร</p>
      {bank.bank_name && <p className="mt-1 text-sm font-medium text-slate-700">{bank.bank_name}</p>}
      <p className="text-xl font-bold tracking-wide text-slate-900">{bank.bank_account_no}</p>
      {bank.bank_account_name && <p className="text-xs text-slate-500">{bank.bank_account_name}</p>}
      <div className="mt-2 flex justify-center">
        <CopyButton value={bank.bank_account_no} />
      </div>
      {amount ? <p className="mt-2 text-base font-bold text-slate-900">{formatBaht(amount)}</p> : null}
    </div>
  );
}

/**
 * กล่องช่องทางชำระเงิน
 *
 * หมายเหตุสำคัญ: คิวอาร์ที่ "แอปธนาคารสแกนจ่ายได้" ต้องเป็นคิวอาร์มาตรฐาน Thai QR / พร้อมเพย์
 * ซึ่งอ้างอิงได้แค่ เบอร์มือถือ / เลขบัตรประชาชน / เลขผู้เสียภาษี / e-Wallet เท่านั้น
 * เลขบัญชีธนาคารเปล่าๆ แปลงเป็นคิวอาร์สแกนจ่ายไม่ได้ จึงแสดงเป็นเลขบัญชีให้คัดลอกไปโอนแทน
 * (เดิมทำเป็นคิวอาร์ที่บรรจุข้อความ ซึ่งแอปธนาคารสแกนแล้วไม่ขึ้นอะไรเลย)
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

  if (!hasPP && !hasBank) {
    return <p className="py-6 text-center text-xs text-slate-400">ยังไม่ได้ตั้งค่าช่องทางรับเงิน</p>;
  }

  // เลือกบัญชีธนาคาร (หรือไม่มีพร้อมเพย์ให้ใช้)
  if ((method === "bank" && hasBank) || !hasPP) {
    return (
      <div className="flex w-full flex-col items-center gap-3">
        <BankTransferDetails bank={bank!} amount={amount} />
        {hasPP ? (
          <div className="flex w-full flex-col items-center gap-2 border-t border-slate-200 pt-3">
            <p className="text-xs font-medium text-slate-500">หรือสแกนจ่ายด้วยพร้อมเพย์</p>
            <PromptPayQR promptpayId={promptpayId} amount={amount} size={168} />
          </div>
        ) : (
          <p className="text-center text-[11px] text-slate-400">
            เลขบัญชีธนาคารสร้างคิวอาร์สำหรับสแกนจ่ายไม่ได้
            <br />
            กรุณาโอนโดยกรอกเลขบัญชีข้างต้น
          </p>
        )}
      </div>
    );
  }

  // พร้อมเพย์ (สแกนจ่ายได้ทันที) + เลขบัญชีสำรองถ้ามี
  return (
    <div className="flex w-full flex-col items-center gap-2">
      <PromptPayQR promptpayId={promptpayId} amount={amount} size={168} />
      {amount ? <p className="text-base font-bold text-slate-900">{formatBaht(amount)}</p> : null}
      {hasBank && (
        <div className="mt-1 w-full border-t border-slate-200 pt-3">
          <BankTransferDetails bank={bank!} />
        </div>
      )}
    </div>
  );
}
