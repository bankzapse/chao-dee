"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import {
  loginWithPassword,
  requestOtp,
  verifyOtp,
  type AuthState,
} from "./actions";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "กำลังดำเนินการ…" : label}
    </button>
  );
}

export function LoginForm() {
  const [mode, setMode] = useState<"password" | "otp">("password");
  const [pwState, pwAction] = useActionState<AuthState, FormData>(loginWithPassword, null);
  const [reqState, reqAction] = useActionState<AuthState, FormData>(requestOtp, null);
  const [verState, verAction] = useActionState<AuthState, FormData>(verifyOtp, null);
  const [editing, setEditing] = useState(false);

  const otpStep = Boolean(reqState?.otpSent) && !editing;
  const otpPhone = reqState?.phone ?? "";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">เข้าสู่ระบบ</h1>
        <p className="mt-1 text-sm text-slate-500">
          {mode === "password"
            ? "เข้าสู่ระบบด้วยเบอร์โทร + รหัสผ่าน"
            : otpStep
              ? "กรอกรหัส OTP ที่ส่งไปยังเบอร์ของคุณ"
              : "รับรหัส OTP ทาง SMS"}
        </p>
      </div>

      {/* ---- โหมดรหัสผ่าน ---- */}
      {mode === "password" && (
        <form action={pwAction} className="space-y-4">
          <div>
            <label className="label">เบอร์โทรศัพท์</label>
            <input name="phone" type="tel" inputMode="numeric" className="field" placeholder="0812345678" required autoFocus />
          </div>
          <div>
            <label className="label">รหัสผ่าน</label>
            <input name="password" type="password" className="field" placeholder="รหัสผ่าน" required />
          </div>
          {pwState?.error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{pwState.error}</p>
          )}
          <SubmitButton label="เข้าสู่ระบบ" />
          <button
            type="button"
            onClick={() => setMode("otp")}
            className="w-full text-center text-sm text-indigo-600 hover:text-indigo-700"
          >
            เข้าสู่ระบบด้วยรหัส OTP แทน
          </button>
        </form>
      )}

      {/* ---- โหมด OTP ---- */}
      {mode === "otp" && !otpStep && (
        <form action={reqAction} className="space-y-4">
          <div>
            <label className="label">เบอร์โทรศัพท์</label>
            <input name="phone" type="tel" inputMode="numeric" className="field" placeholder="0812345678" defaultValue={otpPhone} required autoFocus />
            <p className="mt-1 text-xs text-slate-400">จะส่งรหัส OTP ไปยังเบอร์นี้ทาง SMS</p>
          </div>
          {reqState?.error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{reqState.error}</p>
          )}
          <SubmitButton label="ส่งรหัส OTP" />
          <button
            type="button"
            onClick={() => setMode("password")}
            className="w-full text-center text-sm text-indigo-600 hover:text-indigo-700"
          >
            ← เข้าสู่ระบบด้วยรหัสผ่าน
          </button>
        </form>
      )}

      {mode === "otp" && otpStep && (
        <form action={verAction} className="space-y-4">
          <p className="text-sm text-slate-500">
            ส่งรหัสไปที่ <span className="font-medium text-slate-800">{otpPhone}</span> แล้ว
          </p>
          <input type="hidden" name="phone" value={otpPhone} />
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
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{verState.error}</p>
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

      <p className="mt-6 text-center text-sm text-slate-500">
        ยังไม่มีบัญชี?{" "}
        <Link href="/signup" className="font-medium text-indigo-600 hover:text-indigo-700">
          สมัครใช้งานฟรี
        </Link>
      </p>
    </div>
  );
}
