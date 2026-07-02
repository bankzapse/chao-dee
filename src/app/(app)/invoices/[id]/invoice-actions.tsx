"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ModalButton } from "@/components/modal";
import { ActionForm } from "@/components/action-form";
import { recordPayment, sendInvoiceViaLine } from "../actions";
import { PAYMENT_METHOD_LABEL } from "@/lib/format";
import type { PaymentMethod } from "@/lib/types";

export function PrintButton() {
  return (
    <button className="btn-secondary no-print" onClick={() => window.print()}>
      🖨️ พิมพ์ / บันทึก PDF
    </button>
  );
}

export function SendInvoiceLineButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState("");

  return (
    <div className="no-print flex items-center gap-2">
      {msg && <span className="text-xs text-rose-600">{msg}</span>}
      <button
        className="btn-secondary"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setMsg("");
            const res = await sendInvoiceViaLine(invoiceId);
            if (res.error) setMsg(res.error);
            else {
              setMsg("ส่งแล้ว ✓");
              router.refresh();
            }
          })
        }
      >
        {pending ? "กำลังส่ง…" : "📤 ส่งบิลผ่าน LINE"}
      </button>
    </div>
  );
}

export function RecordPaymentButton({
  invoiceId,
  outstanding,
  today,
}: {
  invoiceId: string;
  outstanding: number;
  today: string;
}) {
  return (
    <ModalButton label="+ บันทึกการชำระ" title="บันทึกการชำระเงิน">
      {(close) => (
        <ActionForm
          action={recordPayment.bind(null, invoiceId)}
          onSuccess={close}
          submitLabel="บันทึก"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">จำนวนเงิน (บาท) *</label>
              <input
                name="amount"
                type="number"
                step="0.01"
                className="field"
                defaultValue={outstanding > 0 ? outstanding : ""}
                required
              />
            </div>
            <div>
              <label className="label">วันที่ชำระ *</label>
              <input name="paid_at" type="date" className="field" defaultValue={today} required />
            </div>
          </div>
          <div>
            <label className="label">ช่องทาง</label>
            <select name="method" className="field" defaultValue="transfer">
              {(Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]).map((m) => (
                <option key={m} value={m}>
                  {PAYMENT_METHOD_LABEL[m]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">หมายเหตุ</label>
            <input name="note" className="field" />
          </div>
        </ActionForm>
      )}
    </ModalButton>
  );
}
