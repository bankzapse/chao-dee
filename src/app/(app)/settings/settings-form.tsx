"use client";

import { ActionForm } from "@/components/action-form";
import { PromptPayQR } from "@/components/promptpay-qr";
import { updateOrgSettings } from "./actions";
import { useState } from "react";

type Org = {
  name: string;
  promptpay_id: string;
  promptpay_name: string;
  invoice_note: string;
};

export function SettingsForm({ org }: { org: Org }) {
  const [ppId, setPpId] = useState(org.promptpay_id);

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <div className="md:col-span-2">
        <div className="card p-6">
          <ActionForm action={updateOrgSettings} submitLabel="บันทึกการตั้งค่า">
            <div>
              <label className="label">ชื่อกิจการ / หอพัก *</label>
              <input name="name" className="field" defaultValue={org.name} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">PromptPay (เบอร์/เลขบัตร)</label>
                <input
                  name="promptpay_id"
                  className="field"
                  defaultValue={org.promptpay_id}
                  placeholder="0812345678"
                  onChange={(e) => setPpId(e.target.value)}
                />
              </div>
              <div>
                <label className="label">ชื่อบัญชี PromptPay</label>
                <input
                  name="promptpay_name"
                  className="field"
                  defaultValue={org.promptpay_name}
                  placeholder="นายสมชาย ใจดี"
                />
              </div>
            </div>
            <div>
              <label className="label">ข้อความท้ายบิล</label>
              <textarea
                name="invoice_note"
                className="field"
                rows={2}
                defaultValue={org.invoice_note}
                placeholder="ชำระภายในวันที่ครบกำหนด มิฉะนั้นมีค่าปรับ 100 บาท/วัน"
              />
            </div>
          </ActionForm>
        </div>
      </div>

      <div className="card flex flex-col items-center justify-center p-6">
        <p className="mb-3 text-sm font-medium text-slate-600">ตัวอย่าง QR</p>
        <PromptPayQR promptpayId={ppId} size={180} />
      </div>
    </div>
  );
}
