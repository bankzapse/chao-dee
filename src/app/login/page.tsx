"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { requestOtp, verifyOtp, type AuthState } from "./actions";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "กำลังดำเนินการ…" : label}
    </button>
  );
}

export default function LoginPage() {
  const [reqState, reqAction] = useActionState<AuthState, FormData>(requestOtp, null);
  const [verState, verAction] = useActionState<AuthState, FormData>(verifyOtp, null);
  const [editing, setEditing] = useState(false);

  const otpStep = Boolean(reqState?.otpSent) && !editing;
  const phone = reqState?.phone ?? "";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-slate-100 p-4">
      <div className="card w-full max-w-md p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-xl font-bold text-white">
            ช
          </div>
          <h1 className="text-2xl font-bold text-slate-900">ChaoDee</h1>
          <p className="mt-1 text-sm text-slate-500">หอพัก · คอนโด · อพาร์ตเมนต์</p>
        </div>

        {!otpStep ? (
          /* ---------- ขั้น 1: กรอกเบอร์ ---------- */
          <form action={reqAction} className="space-y-4">
            <div>
              <label className="label">เบอร์โทรศัพท์</label>
              <input
                name="phone"
                type="tel"
                inputMode="numeric"
                className="field"
                placeholder="0812345678"
                defaultValue={phone}
                required
                autoFocus
              />
              <p className="mt-1 text-xs text-slate-400">
                จะส่งรหัส OTP ไปยังเบอร์นี้ทาง SMS
              </p>
            </div>
            <details className="text-sm">
              <summary className="cursor-pointer text-slate-500">
                สมัครใหม่? (ระบุชื่อหอพัก)
              </summary>
              <div className="mt-3 space-y-3">
                <div>
                  <label className="label">ชื่อ-นามสกุล</label>
                  <input name="full_name" className="field" placeholder="สมชาย ใจดี" />
                </div>
                <div>
                  <label className="label">ชื่อหอพัก / กิจการ</label>
                  <input name="org_name" className="field" placeholder="หอพักสุขใจ" />
                </div>
              </div>
            </details>

            {reqState?.error && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">
                {reqState.error}
              </p>
            )}
            <SubmitButton label="ส่งรหัส OTP" />
          </form>
        ) : (
          /* ---------- ขั้น 2: กรอก OTP ---------- */
          <form action={verAction} className="space-y-4">
            <p className="text-center text-sm text-slate-500">
              ส่งรหัส OTP ไปที่ <span className="font-medium text-slate-800">{phone}</span> แล้ว
            </p>
            <input type="hidden" name="phone" value={phone} />
            <div>
              <label className="label">รหัส OTP</label>
              <input
                name="code"
                inputMode="numeric"
                className="field text-center text-lg tracking-[0.5em]"
                placeholder="______"
                maxLength={6}
                required
                autoFocus
              />
            </div>

            {verState?.error && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">
                {verState.error}
              </p>
            )}
            <SubmitButton label="ยืนยันเข้าสู่ระบบ" />
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="w-full text-center text-sm text-slate-400 hover:text-slate-600"
            >
              ← แก้ไขเบอร์ / ขอรหัสใหม่
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
