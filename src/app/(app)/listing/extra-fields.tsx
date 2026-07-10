"use client";

import type { PropertyListing } from "@/lib/types";

type Vals = Record<string, unknown> | undefined;

/** ฟิลด์รายละเอียดสไตล์ renthub (ค่าใช้จ่ายย่อย, ขนาด, กฎ, ใกล้เคียง) — ใช้ร่วม 2 ฟอร์ม */
export function ListingExtraFields({ listing, v }: { listing?: PropertyListing; v?: Vals }) {
  const n = (k: keyof PropertyListing) => {
    const val = Number((v?.[k] as number) ?? listing?.[k] ?? 0);
    return val || "";
  };
  const s = (k: keyof PropertyListing, d = "") => (v?.[k] as string) ?? (listing?.[k] as string) ?? d;
  const petsChecked =
    v?.pets_allowed !== undefined ? Boolean(v?.pets_allowed) : Boolean(listing?.pets_allowed);

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
      <p className="text-sm font-semibold text-slate-700">ค่าใช้จ่าย (ระบุเท่าที่มี)</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">เงินประกัน (บาท)</label>
          <input name="deposit" type="number" step="1" min={0} className="field" defaultValue={n("deposit")} placeholder="เช่น 3000" />
        </div>
        <div>
          <label className="label">จ่ายล่วงหน้า (บาท)</label>
          <input name="advance_payment" type="number" step="1" min={0} className="field" defaultValue={n("advance_payment")} placeholder="เช่น 3000" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">ค่าน้ำ</label>
          <div className="flex gap-2">
            <input name="water_rate" type="number" step="0.01" min={0} className="field" defaultValue={n("water_rate")} placeholder="เช่น 18" />
            <select name="water_mode" className="field w-40" defaultValue={s("water_mode", "unit")}>
              <option value="unit">บาท/หน่วย</option>
              <option value="person">บาท/คน/เดือน</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">ค่าไฟ (บาท/หน่วย)</label>
          <input name="electric_rate" type="number" step="0.01" min={0} className="field" defaultValue={n("electric_rate")} placeholder="เช่น 7" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label">ค่าส่วนกลาง/เดือน</label>
          <input name="common_fee" type="number" step="1" min={0} className="field" defaultValue={n("common_fee")} placeholder="0" />
        </div>
        <div>
          <label className="label">ค่าเน็ต/เดือน</label>
          <input name="internet_fee" type="number" step="1" min={0} className="field" defaultValue={n("internet_fee")} placeholder="0" />
        </div>
        <div>
          <label className="label">ขนาดห้อง (ตร.ม.)</label>
          <input name="size_sqm" type="number" step="0.1" min={0} className="field" defaultValue={n("size_sqm")} placeholder="เช่น 24" />
        </div>
      </div>

      <p className="pt-1 text-sm font-semibold text-slate-700">ผู้เช่า / กฎการเข้าพัก</p>
      <div className="grid grid-cols-2 items-end gap-3">
        <div>
          <label className="label">รับผู้เช่า</label>
          <select name="tenant_gender" className="field" defaultValue={s("tenant_gender", "any")}>
            <option value="any">รับทุกเพศ</option>
            <option value="male">ชายเท่านั้น</option>
            <option value="female">หญิงเท่านั้น</option>
          </select>
        </div>
        <label className="mb-2 inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="pets_allowed" value="1" defaultChecked={petsChecked} className="accent-indigo-600" />
          เลี้ยงสัตว์ได้
        </label>
      </div>

      <div>
        <label className="label">สถานที่ใกล้เคียง <span className="text-slate-400">(ไม่บังคับ)</span></label>
        <textarea
          name="nearby"
          rows={2}
          className="field"
          defaultValue={s("nearby")}
          placeholder="เช่น ใกล้ ม.เชียงใหม่ 2 กม. · เซเว่น 100 ม. · ตลาด 500 ม."
        />
      </div>
    </div>
  );
}
