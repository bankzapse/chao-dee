"use client";

import { ActionForm } from "@/components/action-form";
import { PromptPayQR } from "@/components/promptpay-qr";
import { QrImageUpload } from "@/components/qr-image-upload";
import { type PaymentMethod } from "@/components/payment-box";
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
  bank_qr_url: string;
};

export function SettingsForm({ org }: { org: Org }) {
  const [ppId, setPpId] = useState(org.promptpay_id);
  const [method, setMethod] = useState<PaymentMethod>(org.payment_method || "promptpay");
  const [bankName, setBankName] = useState(org.bank_name);
  const [bankNo, setBankNo] = useState(org.bank_account_no);
  const [bankAccName, setBankAccName] = useState(org.bank_account_name);
  const [bankQr, setBankQr] = useState(org.bank_qr_url);

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
              <p className="mt-1.5 text-[11px] text-slate-400">
                บิลผู้เช่าจะแสดง<b>เฉพาะช่องทางที่เลือก</b>เท่านั้น (แสดงสองทางพร้อมกันทำให้ผู้เช่าลังเล
                และเงินเข้าคนละที่จนกระทบยอดยาก) — อีกช่องทางกรอกเก็บไว้ได้ ไว้สลับมาใช้ทีหลัง
              </p>
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
              <div className="mt-3">
                <QrImageUpload name="bank_qr_url" value={bankQr} onChange={setBankQr} />
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

      {/* พรีวิวสิ่งที่ผู้เช่าจะเห็นในบิล */}
      <div className="card flex flex-col items-center gap-5 p-6">
        {/* ตัวที่ไม่ได้เลือกจะจางลง ให้เห็นชัดว่าผู้เช่าไม่ได้เห็นอันนั้น */}
        <div className={`flex flex-col items-center ${method === "promptpay" ? "" : "opacity-40"}`}>
          <p className={`mb-2 text-sm font-medium ${method === "promptpay" ? "text-indigo-600" : "text-slate-500"}`}>
            QR พร้อมเพย์ {method === "promptpay" ? "· ผู้เช่าเห็นอันนี้" : "· ไม่แสดงในบิล"}
          </p>
          <PromptPayQR promptpayId={ppId} size={150} />
        </div>
        <div className="w-full border-t border-slate-100" />
        <div className={`flex w-full flex-col items-center ${method === "bank" ? "" : "opacity-40"}`}>
          <p className={`mb-2 text-sm font-medium ${method === "bank" ? "text-indigo-600" : "text-slate-500"}`}>
            บัญชีธนาคาร {method === "bank" ? "· ผู้เช่าเห็นอันนี้" : "· ไม่แสดงในบิล"}
          </p>
          {bankNo ? (
            <div className="text-center">
              {bankQr && (
                <div className="mb-2 flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={bankQr}
                    alt="QR บัญชีธนาคาร"
                    className="h-36 w-36 rounded-lg bg-white object-contain p-2 ring-1 ring-slate-200"
                  />
                </div>
              )}
              {bankName && <p className="text-sm font-medium text-slate-700">{bankName}</p>}
              <p className="text-lg font-bold tracking-wide text-slate-900">{bankNo}</p>
              {bankAccName && <p className="text-xs text-slate-500">{bankAccName}</p>}
            </div>
          ) : (
            <p className="py-4 text-center text-xs text-slate-400">กรอกเลขบัญชีเพื่อแสดงในบิล</p>
          )}
        </div>
        <p className="rounded-lg bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-800">
          <b>ระบบสร้างคิวอาร์จากเลขบัญชีธนาคารให้ไม่ได้</b> — มาตรฐาน Thai QR อ้างอิงได้แค่
          พร้อมเพย์ (เบอร์มือถือ / เลขบัตรประชาชน / เลขผู้เสียภาษี 13 หลัก) ถ้าไม่ใส่อะไรเพิ่ม
          ระบบจะแสดงเป็นเลขบัญชีให้ผู้เช่าคัดลอกไปโอน
          <br />
          <b>อยากให้ผู้เช่าสแกนจ่ายได้</b> เลือกอย่างใดอย่างหนึ่ง —{" "}
          <b>1)</b> ผูกพร้อมเพย์กับบัญชีนี้ที่แอปธนาคาร แล้วกรอกเลขพร้อมเพย์ด้านซ้าย หรือ{" "}
          <b>2)</b> บันทึกรูป QR รับเงินจากแอปธนาคาร แล้วอัปโหลดในช่อง “รูป QR ของบัญชีธนาคาร”
        </p>
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
