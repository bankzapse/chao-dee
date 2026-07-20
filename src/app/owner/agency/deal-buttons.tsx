"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ModalButton } from "@/components/modal";
import { ActionForm } from "@/components/action-form";
import { Spinner } from "@/components/spinner";
import type { DealStatus } from "@/lib/agency";
import {
  createDealFromLead,
  setDealStatus,
  markDealSigned,
  issueCommissionInvoice,
  confirmCommissionPaid,
  cancelDeal,
} from "./actions";

function TxButton({
  onRun,
  label,
  className,
  confirm,
}: {
  onRun: () => Promise<void>;
  label: string;
  className: string;
  confirm?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      className={`inline-flex items-center gap-1.5 ${className}`}
      disabled={pending}
      onClick={() =>
        start(async () => {
          if (confirm && !window.confirm(confirm)) return;
          await onRun();
          router.refresh();
        })
      }
    >
      {pending && <Spinner className="!h-3.5 !w-3.5" />}
      {pending ? "กำลังทำรายการ…" : label}
    </button>
  );
}

export function CreateDealButton({ leadId }: { leadId: string }) {
  return (
    <TxButton
      onRun={() => createDealFromLead(leadId)}
      label="+ สร้างดีล"
      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
    />
  );
}

export function AdvanceButton({ dealId, to, label }: { dealId: string; to: DealStatus; label: string }) {
  return (
    <TxButton
      onRun={() => setDealStatus(dealId, to)}
      label={label}
      className="text-sm font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
    />
  );
}

/** ปิดดีล: กรอกค่าเช่า/เดือน แล้วระบบคำนวณค่านายหน้า (1 เดือน) */
export function MarkSignedButton({ dealId }: { dealId: string }) {
  return (
    <ModalButton label="✓ เซ็นสัญญาแล้ว" title="ปิดดีล — ผู้เช่าเซ็นสัญญาแล้ว">
      {(close) => (
        <ActionForm action={markDealSigned.bind(null, dealId)} onSuccess={close} submitLabel="ปิดดีล & คำนวณค่านายหน้า">
          <div>
            <label className="label">ค่าเช่าห้อง/เดือน (บาท) *</label>
            <input name="rent_base" type="number" step="0.01" min="1" className="field" required placeholder="เช่น 3500" />
            <p className="mt-1 text-xs text-slate-400">
              ค่านายหน้า = ค่าเช่า 1 เดือน · ใช้ค่าเช่าห้องเท่านั้น (ไม่รวมน้ำ/ไฟ/ส่วนกลาง/มัดจำ)
            </p>
          </div>
          <div>
            <label className="label">หมายเหตุ</label>
            <input name="note" className="field" placeholder="เช่น เข้าอยู่ 1 ส.ค." />
          </div>
        </ActionForm>
      )}
    </ModalButton>
  );
}

export function IssueInvoiceButton({ dealId }: { dealId: string }) {
  return (
    <TxButton
      onRun={() => issueCommissionInvoice(dealId)}
      label="วางบิล"
      className="text-sm font-medium text-amber-600 hover:text-amber-700 disabled:opacity-50"
      confirm="ออกใบแจ้งหนี้ค่านายหน้าให้เจ้าของหอ?"
    />
  );
}

export function ConfirmPaidButton({ dealId }: { dealId: string }) {
  return (
    <TxButton
      onRun={() => confirmCommissionPaid(dealId)}
      label="✓ ยืนยันรับเงิน"
      className="text-sm font-medium text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
      confirm="ยืนยันว่าได้รับค่านายหน้าแล้ว?"
    />
  );
}

export function CancelDealButton({ dealId }: { dealId: string }) {
  return (
    <TxButton
      onRun={() => cancelDeal(dealId)}
      label="ยกเลิก"
      className="text-sm font-medium text-slate-400 hover:text-rose-600 disabled:opacity-50"
      confirm="ยกเลิกดีลนี้?"
    />
  );
}
