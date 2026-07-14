"use client";

import { useState } from "react";
import { ActionForm } from "@/components/action-form";
import { updateTaxInfo } from "./actions";

export type TaxInfo = {
  tax_entity_type: "juristic" | "individual";
  tax_name: string;
  tax_id: string;
  tax_address: string;
  tax_branch: string;
};

export function TaxInfoCard({ org }: { org: TaxInfo }) {
  const [type, setType] = useState<"juristic" | "individual">(org.tax_entity_type || "juristic");
  const isIndiv = type === "individual";

  return (
    <div className="card mb-6 p-5">
      <h2 className="font-semibold text-slate-900">ข้อมูลสำหรับใบกำกับภาษี</h2>
      <p className="mt-1 text-xs text-slate-500">
        กรอกข้อมูลผู้เสียภาษีของคุณ เพื่อให้เราออก <b>ใบกำกับภาษี</b> ค่าบริการ Chao-Dee ได้ถูกต้อง (ไว้ลดหย่อน)
      </p>
      <div className="mt-4">
        <ActionForm action={updateTaxInfo} submitLabel="บันทึกข้อมูลภาษี">
          {/* ประเภทผู้เสียภาษี */}
          <div>
            <label className="label">ประเภทผู้เสียภาษี</label>
            <div className="grid grid-cols-2 gap-3">
              <TypeOption
                active={!isIndiv}
                onClick={() => setType("juristic")}
                title="นิติบุคคล"
                sub="บริษัท / ห้างหุ้นส่วน"
              />
              <TypeOption
                active={isIndiv}
                onClick={() => setType("individual")}
                title="บุคคลธรรมดา"
                sub="ในนามบุคคล"
              />
            </div>
            <input type="hidden" name="tax_entity_type" value={type} />
          </div>

          <div>
            <label className="label">{isIndiv ? "ชื่อ-นามสกุล" : "ชื่อผู้เสียภาษี (นิติบุคคล)"}</label>
            <input
              name="tax_name"
              className="field"
              defaultValue={org.tax_name}
              placeholder={isIndiv ? "นายสมชาย ใจดี" : "บริษัท ตัวอย่าง จำกัด"}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">
                {isIndiv ? "เลขประจำตัวประชาชน (13 หลัก)" : "เลขประจำตัวผู้เสียภาษี (13 หลัก)"}
              </label>
              <input
                name="tax_id"
                inputMode="numeric"
                maxLength={13}
                className="field"
                defaultValue={org.tax_id}
                placeholder={isIndiv ? "1100xxxxxxxxx" : "0105500000000"}
              />
            </div>
            {!isIndiv && (
              <div>
                <label className="label">สำนักงาน</label>
                <select name="tax_branch" className="field" defaultValue={org.tax_branch || "สำนักงานใหญ่"}>
                  <option value="สำนักงานใหญ่">สำนักงานใหญ่</option>
                  <option value="สาขา 00001">สาขา 00001</option>
                  <option value="สาขา 00002">สาขา 00002</option>
                </select>
              </div>
            )}
          </div>
          <div>
            <label className="label">ที่อยู่ตามใบกำกับภาษี</label>
            <textarea
              name="tax_address"
              className="field"
              rows={2}
              defaultValue={org.tax_address}
              placeholder="เลขที่ ถนน ตำบล อำเภอ จังหวัด รหัสไปรษณีย์"
            />
          </div>
        </ActionForm>
      </div>
    </div>
  );
}

function TypeOption({
  active,
  onClick,
  title,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border-2 p-3 text-left transition ${
        active ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-slate-300"
      }`}
    >
      <span className="flex items-center gap-2">
        <span
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
            active ? "border-indigo-600" : "border-slate-300"
          }`}
        >
          {active && <span className="h-2 w-2 rounded-full bg-indigo-600" />}
        </span>
        <span className="font-semibold text-slate-900">{title}</span>
      </span>
      <span className="mt-0.5 block pl-6 text-xs text-slate-400">{sub}</span>
    </button>
  );
}
