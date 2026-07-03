"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { requestOtp, verifyOtp, type AuthState } from "./actions";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "กำลังดำเนินการ…" : label}
    </button>
  );
}

/** ฟอร์ม OTP 2 ขั้น — ใช้ทั้งหน้า login และ signup */
export function OtpForm({ signup }: { signup?: boolean }) {
  const [reqState, reqAction] = useActionState<AuthState, FormData>(requestOtp, null);
  const [verState, verAction] = useActionState<AuthState, FormData>(verifyOtp, null);
  const [editing, setEditing] = useState(false);

  const otpStep = Boolean(reqState?.otpSent) && !editing;
  const phone = reqState?.phone ?? "";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          {signup ? "สมัครใช้งาน ChaoDee" : "เข้าสู่ระบบ"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {otpStep
            ? "กรอกรหัส OTP ที่ส่งไปยังเบอร์ของคุณ"
            : signup
              ? "เริ่มทดลองใช้ฟรี 30 วัน ไม่ต้องผูกบัตร"
              : "เข้าสู่ระบบด้วยเบอร์โทรศัพท์"}
        </p>
      </div>

      {!otpStep ? (
        <form action={reqAction} className="space-y-4">
          {signup && (
            <>
              <div>
                <label className="label">ชื่อ-นามสกุล</label>
                <input name="full_name" className="field" placeholder="สมชาย ใจดี" required />
              </div>
              <div>
                <label className="label">ชื่อหอพัก / กิจการ</label>
                <input name="org_name" className="field" placeholder="หอพักสุขใจ" required />
              </div>
            </>
          )}
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
              autoFocus={!signup}
            />
            <p className="mt-1 text-xs text-slate-400">จะส่งรหัส OTP ไปยังเบอร์นี้ทาง SMS</p>
          </div>

          {reqState?.error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{reqState.error}</p>
          )}
          <SubmitButton label={signup ? "สมัครและรับรหัส OTP" : "ส่งรหัส OTP"} />
        </form>
      ) : (
        <form action={verAction} className="space-y-4">
          <p className="text-sm text-slate-500">
            ส่งรหัสไปที่ <span className="font-medium text-slate-800">{phone}</span> แล้ว
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
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{verState.error}</p>
          )}
          <SubmitButton label={signup ? "ยืนยันและเริ่มใช้งาน" : "ยืนยันเข้าสู่ระบบ"} />
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
        {signup ? (
          <>
            มีบัญชีอยู่แล้ว?{" "}
            <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-700">
              เข้าสู่ระบบ
            </Link>
          </>
        ) : (
          <>
            ยังไม่มีบัญชี?{" "}
            <Link href="/signup" className="font-medium text-indigo-600 hover:text-indigo-700">
              สมัครใช้งานฟรี
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
