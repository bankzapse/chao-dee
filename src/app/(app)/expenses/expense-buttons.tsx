"use client";

import { ModalButton } from "@/components/modal";
import { ActionForm } from "@/components/action-form";
import { createExpense } from "./actions";
import type { Building } from "@/lib/types";

const CATEGORIES = [
  "ค่าน้ำส่วนกลาง",
  "ค่าไฟส่วนกลาง",
  "ค่าซ่อมบำรุง",
  "เงินเดือนพนักงาน",
  "ค่าทำความสะอาด",
  "ค่าอินเทอร์เน็ต",
  "ภาษี/ค่าธรรมเนียม",
  "อื่นๆ",
];

export function AddExpenseButton({ buildings }: { buildings: Building[] }) {
  if (buildings.length === 0) return null;
  return (
    <ModalButton label="+ บันทึกค่าใช้จ่าย" title="บันทึกค่าใช้จ่ายอาคาร">
      {(close) => (
        <ActionForm action={createExpense} onSuccess={close}>
          <div>
            <label className="label">อาคาร *</label>
            <select name="building_id" className="field" defaultValue="" required>
              <option value="" disabled>
                — เลือกอาคาร —
              </option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">หมวดหมู่</label>
              <select name="category" className="field" defaultValue="อื่นๆ">
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">จำนวนเงิน (บาท)</label>
              <input name="amount" type="number" step="0.01" className="field" defaultValue={0} />
            </div>
          </div>
          <div>
            <label className="label">วันที่ *</label>
            <input name="expense_date" type="date" className="field" required />
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
