"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import {
  requestPasswordReset,
  confirmPasswordReset,
  type AuthState,
} from "@/app/login/actions";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "กำลังดำเนินการ…" : label}
    </button>
  );
}

function ResendButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-50" disabled={pending}>
      {pending ? "กำลังส่ง…" : "ขอรหัสใหม่"}
    </button>
  );
}

export function ForgotForm() {
  const [reqState, reqAction] = useActionState<AuthState, FormData>(requestPasswordReset, null);
  const [confState, confAction] = useActionState<AuthState, FormData>(confirmPasswordReset, null);
  const [resendState, resendAction] = useActionState<AuthState, FormData>(requestPasswordReset, null);

  const step2 = Boolean(reqState?.otpSent);
  const phone = reqState?.phone ?? "";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">ลืมรหัสผ่าน</h1>
        <p className="mt-1 text-sm text-slate-500">
          {step2 ? "กรอกรหัส OTP และตั้งรหัสผ่านใหม่" : "กรอกเบอร์โทร เพื่อรับรหัส OTP ยืนยันตัวตน"}
        </p>
      </div>

      {!step2 ? (
        <form action={reqAction} className="space-y-4">
          <div>
            <label className="label">เบอร์โทรศัพท์</label>
            <input name="phone" type="tel" inputMode="numeric" className="field" placeholder="0812345678" required autoFocus />
          </div>
          {reqState?.error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{reqState.error}</p>
          )}
          <SubmitButton label="ส่งรหัส OTP" />
        </form>
      ) : (
        <>
          <form action={confAction} className="space-y-4">
            <p className="text-sm text-slate-500">
              ส่งรหัสไปที่ <span className="font-medium text-slate-800">{phone}</span> แล้ว
            </p>
            <input type="hidden" name="phone" value={phone} />
            <div>
              <div className="flex items-center justify-between">
                <label className="label">รหัส OTP</label>
              </div>
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
            <div>
              <label className="label">รหัสผ่านใหม่</label>
              <input name="password" type="password" className="field" placeholder="อย่างน้อย 8 ตัวอักษร" minLength={8} required />
            </div>
            {confState?.error && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{confState.error}</p>
            )}
            <SubmitButton label="ตั้งรหัสผ่านใหม่ & เข้าสู่ระบบ" />
          </form>

          {/* ขอรหัสใหม่ — ฟอร์มแยก (ห้าม nest form) */}
          <form action={resendAction} className="mt-3 flex flex-col items-center gap-1">
            <input type="hidden" name="phone" value={phone} />
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>ไม่ได้รับรหัส?</span>
              <ResendButton />
            </div>
            {resendState?.otpSent && !resendState?.error && (
              <p className="text-xs font-medium text-emerald-600">✓ ส่งรหัสใหม่ให้แล้ว — ใช้รหัสล่าสุดเท่านั้น</p>
            )}
            {resendState?.error && <p className="text-xs text-rose-600">{resendState.error}</p>}
          </form>
        </>
      )}

      <p className="mt-6 text-center text-sm text-slate-500">
        <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-700">
          ← กลับหน้าเข้าสู่ระบบ
        </Link>
      </p>
    </div>
  );
}
