"use client";

import { useState } from "react";
import { ActionForm } from "@/components/action-form";
import { PromptPayQR } from "@/components/promptpay-qr";
import { QRCodeImg } from "@/components/qr-code";
import { bankQrText, type PaymentMethod } from "@/components/payment-box";
import { THAI_BANKS } from "@/lib/banks";
import { savePlatformPayment } from "../actions";

type Pay = {
  promptpay_id: string;
  promptpay_name: string;
  payment_method: PaymentMethod;
  bank_name: string;
  bank_account_no: string;
  bank_account_name: string;
  tax_name: string;
  tax_id: string;
  tax_address: string;
  tax_branch: string;
};

export function PlatformPaymentForm({ pay }: { pay: Pay }) {
  const [pp, setPp] = useState(pay.promptpay_id);
  const [method, setMethod] = useState<PaymentMethod>(pay.payment_method || "promptpay");
  const [bankName, setBankName] = useState(pay.bank_name);
  const [bankNo, setBankNo] = useState(pay.bank_account_no);
  const [bankAccName, setBankAccName] = useState(pay.bank_account_name);

  const bankText = bankQrText({ bank_name: bankName, bank_account_no: bankNo, bank_account_name: bankAccName });

  return (
    <ActionForm action={savePlatformPayment} submitLabel="บันทึกการตั้งค่า">
      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          <div className="card p-6 space-y-5">
            {/* เลือกช่องทางหลัก */}
            <div>
              <label className="label">ช่องทางรับเงินหลัก (แสดงในหน้าต่ออายุ)</label>
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
                  <select name="bank_name" className="field" value={bankName} onChange={(e) => setBankName(e.target.value)}>
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
                  placeholder="บจก. ..."
                />
              </div>
            </div>

            {/* ข้อมูลใบกำกับภาษีของบริษัท */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <p className="text-sm font-medium text-slate-700">ข้อมูลสำหรับใบกำกับภาษี (ของบริษัท)</p>
              <p className="mb-3 mt-0.5 text-xs text-slate-500">
                ข้อมูลผู้ขาย/ผู้ออกใบกำกับภาษี ที่จะแสดงบนใบเสร็จ/ใบกำกับภาษีค่าบริการที่ออกให้ลูกค้า
              </p>
              <div>
                <label className="label">ชื่อผู้เสียภาษี (บริษัท)</label>
                <input name="tax_name" className="field" defaultValue={pay.tax_name} placeholder="ห้างหุ้นส่วนจำกัด ..." />
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label">เลขประจำตัวผู้เสียภาษี (13 หลัก)</label>
                  <input
                    name="tax_id"
                    inputMode="numeric"
                    maxLength={13}
                    className="field"
                    defaultValue={pay.tax_id}
                    placeholder="0105500000000"
                  />
                </div>
                <div>
                  <label className="label">สำนักงาน</label>
                  <select name="tax_branch" className="field" defaultValue={pay.tax_branch || "สำนักงานใหญ่"}>
                    <option value="สำนักงานใหญ่">สำนักงานใหญ่</option>
                    <option value="สาขา 00001">สาขา 00001</option>
                    <option value="สาขา 00002">สาขา 00002</option>
                  </select>
                </div>
              </div>
              <div className="mt-3">
                <label className="label">ที่อยู่ตามใบกำกับภาษี</label>
                <textarea
                  name="tax_address"
                  className="field"
                  rows={2}
                  defaultValue={pay.tax_address}
                  placeholder="เลขที่ ถนน ตำบล อำเภอ จังหวัด รหัสไปรษณีย์"
                />
              </div>
            </div>

            <p className="text-xs text-slate-400">
              ช่องทางที่เลือกจะแสดงในหน้า “ต่ออายุ/อัปเกรด” ให้เจ้าของหอสแกน/โอนจ่ายค่าสมาชิก
            </p>
          </div>
        </div>

        {/* พรีวิว QR ทั้งสองแบบ */}
        <div className="card flex h-fit flex-col items-center gap-5 p-6">
          <div className="flex flex-col items-center">
            <p className={`mb-2 text-sm font-medium ${method === "promptpay" ? "text-indigo-600" : "text-slate-500"}`}>
              QR พร้อมเพย์ {method === "promptpay" && "· ใช้จริง"}
            </p>
            <PromptPayQR promptpayId={pp} size={150} />
          </div>
          <div className="w-full border-t border-slate-100" />
          <div className="flex flex-col items-center">
            <p className={`mb-2 text-sm font-medium ${method === "bank" ? "text-indigo-600" : "text-slate-500"}`}>
              QR บัญชีธนาคาร {method === "bank" && "· ใช้จริง"}
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
    </ActionForm>
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
