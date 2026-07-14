"use client";

import { ActionForm } from "@/components/action-form";
import { PromptPayQR } from "@/components/promptpay-qr";
import { QRCodeImg } from "@/components/qr-code";
import { bankQrText, type PaymentMethod } from "@/components/payment-box";
import { THAI_BANKS } from "@/lib/banks";
import { updateOrgSettings } from "./actions";
import { useState } from "react";

type Org = {
  name: string;
  promptpay_id: string;
  promptpay_name: string;
  invoice_note: string;
  payment_method: PaymentMethod;
  bank_name: string;
  bank_account_no: string;
  bank_account_name: string;
};

export function SettingsForm({ org }: { org: Org }) {
  const [ppId, setPpId] = useState(org.promptpay_id);
  const [method, setMethod] = useState<PaymentMethod>(org.payment_method || "promptpay");
  const [bankName, setBankName] = useState(org.bank_name);
  const [bankNo, setBankNo] = useState(org.bank_account_no);
  const [bankAccName, setBankAccName] = useState(org.bank_account_name);

  const bankText = bankQrText({ bank_name: bankName, bank_account_no: bankNo, bank_account_name: bankAccName });

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <div className="md:col-span-2">
        <div className="card p-6">
          <ActionForm action={updateOrgSettings} submitLabel="บันทึกการตั้งค่า">
            <div>
              <label className="label">ชื่อกิจการ / หอพัก *</label>
              <input name="name" className="field" defaultValue={org.name} required />
            </div>

            {/* เลือกช่องทางหลักที่จะแสดงในบิลผู้เช่า */}
            <div>
              <label className="label">ช่องทางรับเงินหลัก (แสดงในบิลผู้เช่า)</label>
              <div className="grid grid-cols-2 gap-3">
                <MethodOption
                  active={method === "promptpay"}
                  onClick={() => setMethod("promptpay")}
                  title="พร้อมเพย์ (QR)"
                  sub="สแกนจ่ายได้ทันที"
                />
                <MethodOption
                  active={method === "bank"}
                  onClick={() => setMethod("bank")}
                  title="บัญชีธนาคาร"
                  sub="โอนเข้าเลขบัญชี"
                />
              </div>
              <input type="hidden" name="payment_method" value={method} />
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

            {/* บัญชีธนาคาร */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <p className="mb-2 text-sm font-medium text-slate-700">บัญชีธนาคาร</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">ธนาคาร</label>
                  <select
                    name="bank_name"
                    className="field"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                  >
                    <option value="">— เลือกธนาคาร —</option>
                    {bankName && !THAI_BANKS.includes(bankName) && <option value={bankName}>{bankName}</option>}
                    {THAI_BANKS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">เลขที่บัญชี</label>
                  <input
                    name="bank_account_no"
                    className="field"
                    value={bankNo}
                    onChange={(e) => setBankNo(e.target.value)}
                    placeholder="123-4-56789-0"
                  />
                </div>
              </div>
              <div className="mt-3">
                <label className="label">ชื่อบัญชี</label>
                <input
                  name="bank_account_name"
                  className="field"
                  value={bankAccName}
                  onChange={(e) => setBankAccName(e.target.value)}
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

      {/* พรีวิว QR ทั้งสองแบบ */}
      <div className="card flex flex-col items-center gap-5 p-6">
        <div className="flex flex-col items-center">
          <p className={`mb-2 text-sm font-medium ${method === "promptpay" ? "text-indigo-600" : "text-slate-500"}`}>
            QR พร้อมเพย์ {method === "promptpay" && "· ใช้ในบิล"}
          </p>
          <PromptPayQR promptpayId={ppId} size={150} />
        </div>
        <div className="w-full border-t border-slate-100" />
        <div className="flex flex-col items-center">
          <p className={`mb-2 text-sm font-medium ${method === "bank" ? "text-indigo-600" : "text-slate-500"}`}>
            QR บัญชีธนาคาร {method === "bank" && "· ใช้ในบิล"}
          </p>
          {bankNo ? (
            <>
              <QRCodeImg text={bankText} size={150} />
              <p className="mt-1 text-center text-[11px] text-slate-400">สแกนเพื่อดูเลขบัญชี</p>
            </>
          ) : (
            <p className="py-8 text-center text-xs text-slate-400">กรอกเลขบัญชีเพื่อสร้าง QR</p>
          )}
        </div>
      </div>
    </div>
  );
}

function MethodOption({
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
