"use client";

import { ActionForm } from "@/components/action-form";
import { updateTaxInfo } from "./actions";

export type TaxInfo = {
  tax_name: string;
  tax_id: string;
  tax_address: string;
  tax_branch: string;
};

export function TaxInfoCard({ org }: { org: TaxInfo }) {
  return (
    <div className="card mb-6 p-5">
      <h2 className="font-semibold text-slate-900">ข้อมูลสำหรับใบกำกับภาษี</h2>
      <p className="mt-1 text-xs text-slate-500">
        กรอกข้อมูลนิติบุคคล/ผู้เสียภาษีของคุณ เพื่อให้เราออก <b>ใบกำกับภาษี</b> ค่าบริการ ChaoDee ได้ถูกต้อง (ไว้ลดหย่อน)
      </p>
      <div className="mt-4">
        <ActionForm action={updateTaxInfo} submitLabel="บันทึกข้อมูลภาษี">
          <div>
            <label className="label">ชื่อผู้เสียภาษี (บริษัท/บุคคล)</label>
            <input name="tax_name" className="field" defaultValue={org.tax_name} placeholder="บริษัท ตัวอย่าง จำกัด" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">เลขประจำตัวผู้เสียภาษี (13 หลัก)</label>
              <input name="tax_id" inputMode="numeric" maxLength={13} className="field" defaultValue={org.tax_id} placeholder="0105500000000" />
            </div>
            <div>
              <label className="label">สำนักงาน</label>
              <select name="tax_branch" className="field" defaultValue={org.tax_branch || "สำนักงานใหญ่"}>
                <option value="สำนักงานใหญ่">สำนักงานใหญ่</option>
                <option value="สาขา 00001">สาขา 00001</option>
                <option value="สาขา 00002">สาขา 00002</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">ที่อยู่ตามใบกำกับภาษี</label>
            <textarea name="tax_address" className="field" rows={2} defaultValue={org.tax_address} placeholder="เลขที่ ถนน ตำบล อำเภอ จังหวัด รหัสไปรษณีย์" />
          </div>
        </ActionForm>
      </div>
    </div>
  );
}
