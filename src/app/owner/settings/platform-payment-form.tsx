"use client";

import { useState } from "react";
import { ActionForm } from "@/components/action-form";
import { PromptPayQR } from "@/components/promptpay-qr";
import { THAI_BANKS } from "@/lib/banks";
import { savePlatformPayment } from "../actions";

type Pay = {
  promptpay_id: string;
  promptpay_name: string;
  bank_name: string;
  bank_account_no: string;
  bank_account_name: string;
};

export function PlatformPaymentForm({ pay }: { pay: Pay }) {
  const [pp, setPp] = useState(pay.promptpay_id);

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <div className="md:col-span-2">
        <div className="card p-6">
          <ActionForm action={savePlatformPayment} submitLabel="บันทึกช่องทางรับเงิน">
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">PromptPay บริษัท</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">PromptPay (เบอร์/เลขบัตร/เลขนิติบุคคล)</label>
                  <input
                    name="promptpay_id"
                    className="field"
                    defaultValue={pay.promptpay_id}
                    placeholder="0812345678"
                    onChange={(e) => setPp(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">ชื่อบัญชี PromptPay</label>
                  <input name="promptpay_name" className="field" defaultValue={pay.promptpay_name} placeholder="บจก. ..." />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <p className="mb-2 text-sm font-medium text-slate-700">บัญชีธนาคารบริษัท</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">ธนาคาร</label>
                  <select name="bank_name" className="field" defaultValue={pay.bank_name}>
                    <option value="">— เลือกธนาคาร —</option>
                    {pay.bank_name && !THAI_BANKS.includes(pay.bank_name) && (
                      <option value={pay.bank_name}>{pay.bank_name}</option>
                    )}
                    {THAI_BANKS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">เลขที่บัญชี</label>
                  <input name="bank_account_no" className="field" defaultValue={pay.bank_account_no} placeholder="123-4-56789-0" />
                </div>
              </div>
              <div className="mt-3">
                <label className="label">ชื่อบัญชี</label>
                <input name="bank_account_name" className="field" defaultValue={pay.bank_account_name} placeholder="บจก. ..." />
              </div>
            </div>

            <p className="text-xs text-slate-400">
              ช่องทางเหล่านี้จะแสดงในหน้า “ต่ออายุ/อัปเกรด” ให้เจ้าของหอสแกน/โอนจ่ายค่าสมาชิก
            </p>
          </ActionForm>
        </div>
      </div>

      <div className="card flex flex-col items-center justify-center p-6">
        <p className="mb-3 text-sm font-medium text-slate-600">ตัวอย่าง QR PromptPay</p>
        <PromptPayQR promptpayId={pp} size={180} />
      </div>
    </div>
  );
}
