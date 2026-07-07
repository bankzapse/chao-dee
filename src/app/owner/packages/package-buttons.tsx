"use client";

import { ModalButton } from "@/components/modal";
import { ActionForm } from "@/components/action-form";
import { updatePackagePrice } from "./actions";

export function EditPriceButton({
  slug,
  name,
  priceMonthly,
  priceYearlyPerMonth,
  priceYearlyTotal,
}: {
  slug: string;
  name: string;
  priceMonthly: number | null;
  priceYearlyPerMonth: number | null;
  priceYearlyTotal: number | null;
}) {
  return (
    <ModalButton label="แก้ราคา" title={`แก้ราคาแพ็คเกจ ${name}`} variant="secondary">
      {(close) => (
        <ActionForm action={updatePackagePrice.bind(null, slug)} onSuccess={close} submitLabel="บันทึกราคา">
          <div>
            <label className="label">ราคารายเดือน (บาท/เดือน)</label>
            <input name="price_monthly" type="number" step="1" className="field" defaultValue={priceMonthly ?? ""} placeholder="เช่น 499" />
          </div>
          <div>
            <label className="label">ราคารายปี — ต่อเดือน (บาท/เดือน)</label>
            <input name="price_yearly_per_month" type="number" step="1" className="field" defaultValue={priceYearlyPerMonth ?? ""} placeholder="เช่น 416" />
          </div>
          <div>
            <label className="label">ราคารายปี — ยอดรวมทั้งปี (บาท/ปี)</label>
            <input name="price_yearly_total" type="number" step="1" className="field" defaultValue={priceYearlyTotal ?? ""} placeholder="เช่น 4990" />
          </div>
          <p className="text-xs text-slate-400">
            เว้นว่างช่องไหน = ใช้ค่าเริ่มต้นของระบบ · ราคานี้จะมีผลทันทีที่หน้าแรกและหน้าต่ออายุ
          </p>
        </ActionForm>
      )}
    </ModalButton>
  );
}
