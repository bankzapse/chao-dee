"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { loginWithPassword, type AuthState } from "./actions";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "กำลังดำเนินการ…" : label}
    </button>
  );
}

export function LoginForm({
  next,
  signupHref = "/signup",
}: {
  next?: string;
  signupHref?: string;
} = {}) {
  const [pwState, pwAction] = useActionState<AuthState, FormData>(loginWithPassword, null);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">เข้าสู่ระบบ</h1>
        <p className="mt-1 text-sm text-slate-500">เข้าสู่ระบบด้วยเบอร์โทร + รหัสผ่าน</p>
      </div>

      <form action={pwAction} className="space-y-4">
        {next && <input type="hidden" name="next" value={next} />}
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
        <div className="text-right text-sm">
          <Link href="/forgot-password" className="text-slate-400 hover:text-slate-600">
            ลืมรหัสผ่าน?
          </Link>
        </div>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        ยังไม่มีบัญชี?{" "}
        <Link href={signupHref} className="font-medium text-indigo-600 hover:text-indigo-700">
          สมัครใช้งานฟรี
        </Link>
      </p>
    </div>
  );
}
