"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ModalButton } from "@/components/modal";
import { ActionForm } from "@/components/action-form";
import { recordPayment, sendInvoiceViaLine, updateInvoice, addInvoiceItem } from "../actions";
import { PAYMENT_METHOD_LABEL } from "@/lib/format";
import type { Invoice, PaymentMethod } from "@/lib/types";

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

/** ช่องกรอกเงินในฟอร์มแก้ไขบิล */
function MoneyField({
  name,
  label,
  defaultValue,
  hint,
}: {
  name: string;
  label: string;
  defaultValue: number;
  hint?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        name={name}
        type="number"
        step="0.01"
        min="0"
        className="field"
        defaultValue={defaultValue}
      />
      {hint && <p className="mt-0.5 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

/**
 * แก้ไขบิลด้วยมือ — ใช้เมื่อยอดที่ระบบคิดให้ไม่ตรงกับความจริง
 * (เช่น ตกลงลดค่าเช่าเดือนนี้ หรือจดมิเตอร์ผิด)
 * ยอดรวมคำนวณใหม่จากช่องเหล่านี้ + ค่าใช้จ่ายอื่นๆ − ส่วนลด
 */
export function EditInvoiceButton({ inv }: { inv: Invoice }) {
  return (
    <ModalButton label="✏️ แก้ไขบิล" title="แก้ไขบิล" variant="secondary">
      {(close) => (
        <ActionForm action={updateInvoice.bind(null, inv.id)} onSuccess={close} submitLabel="บันทึกการแก้ไข">
          <div>
            <label className="label">ครบกำหนดชำระ *</label>
            <input
              name="due_date"
              type="date"
              className="field"
              defaultValue={inv.due_date?.slice(0, 10)}
              required
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <MoneyField name="rent_amount" label="ค่าเช่าห้อง" defaultValue={Number(inv.rent_amount)} />
            <MoneyField name="water_amount" label="ค่าน้ำ" defaultValue={Number(inv.water_amount)} />
            <MoneyField
              name="water_units"
              label="หน่วยน้ำ"
              defaultValue={Number(inv.water_units)}
              hint="แสดงในบิลเฉยๆ ไม่ได้เอาไปคูณซ้ำ"
            />
            <MoneyField name="electric_amount" label="ค่าไฟฟ้า" defaultValue={Number(inv.electric_amount)} />
            <MoneyField
              name="electric_units"
              label="หน่วยไฟ"
              defaultValue={Number(inv.electric_units)}
              hint="แสดงในบิลเฉยๆ ไม่ได้เอาไปคูณซ้ำ"
            />
            <MoneyField name="parking_amount" label="ค่าจอดรถ" defaultValue={Number(inv.parking_amount)} />
            <MoneyField name="garbage_amount" label="ค่าขยะ" defaultValue={Number(inv.garbage_amount)} />
            <MoneyField name="discount" label="ส่วนลด" defaultValue={Number(inv.discount)} />
          </div>

          <div>
            <label className="label">หมายเหตุในบิล</label>
            <input name="note" className="field" defaultValue={inv.note ?? ""} />
          </div>

          <p className="rounded-lg bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-800">
            ค่าใช้จ่ายอื่นๆ แก้ที่ปุ่ม “+ ค่าใช้จ่ายอื่นๆ” ในบิล
            <br />
            ยอดรวมจะคิดใหม่ให้อัตโนมัติ = ค่าเช่า + น้ำ + ไฟ + จอดรถ + ขยะ + อื่นๆ − ส่วนลด
            <br />
            <b>ระวัง:</b> ถ้ากด “คำนวณยอดใหม่” ที่หน้ารายการบิลทีหลัง ค่าที่แก้ด้วยมือจะถูกทับด้วยค่าตั้งต้นของห้อง
          </p>
        </ActionForm>
      )}
    </ModalButton>
  );
}

/** เพิ่มรายการค่าใช้จ่ายอื่นๆ เข้าบิล (ค่าปรับ / ค่าส่วนกลาง / ค่าซ่อม ฯลฯ) */
export function AddInvoiceItemButton({ invoiceId }: { invoiceId: string }) {
  return (
    <ModalButton label="+ ค่าใช้จ่ายอื่นๆ" title="เพิ่มค่าใช้จ่ายอื่นๆ" variant="secondary">
      {(close) => (
        <ActionForm
          action={addInvoiceItem.bind(null, invoiceId)}
          onSuccess={close}
          submitLabel="เพิ่มเข้าบิล"
        >
          <div>
            <label className="label">รายการ *</label>
            <input
              name="description"
              className="field"
              placeholder="เช่น ค่าปรับชำระล่าช้า / ค่าซ่อมประตู / ค่าส่วนกลาง"
              required
            />
          </div>
          <div>
            <label className="label">จำนวนเงิน (บาท) *</label>
            <input name="amount" type="number" step="0.01" min="0" className="field" required />
          </div>
          <p className="text-[11px] text-slate-400">
            รายการนี้จะแสดงในบิลของผู้เช่าด้วย และรวมเข้ายอดที่ต้องชำระให้อัตโนมัติ
          </p>
        </ActionForm>
      )}
    </ModalButton>
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
