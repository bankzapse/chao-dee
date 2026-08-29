"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { loginWithPassword, loginWithUsername, type AuthState } from "./actions";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "กำลังดำเนินการ…" : label}
    </button>
  );
}

type Tab = "owner" | "team";

export function LoginForm({
  next,
  signupHref = "/signup",
}: {
  next?: string;
  signupHref?: string;
} = {}) {
  const [tab, setTab] = useState<Tab>("owner");
  const [pwState, pwAction] = useActionState<AuthState, FormData>(loginWithPassword, null);
  const [unState, unAction] = useActionState<AuthState, FormData>(loginWithUsername, null);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">เข้าสู่ระบบ</h1>
        <p className="mt-1 text-sm text-slate-500">
          {tab === "owner" ? "เจ้าของกิจการ — เบอร์โทร + รหัสผ่าน" : "ทีมงาน — ชื่อผู้ใช้ + รหัสผ่าน"}
        </p>
      </div>

      {/* แท็บเลือกประเภทผู้ใช้ */}
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setTab("owner")}
          className={`rounded-lg py-2 text-sm font-medium transition ${
            tab === "owner" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          เจ้าของกิจการ
        </button>
        <button
          type="button"
          onClick={() => setTab("team")}
          className={`rounded-lg py-2 text-sm font-medium transition ${
            tab === "team" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          ทีมงาน
        </button>
      </div>

      {tab === "owner" ? (
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
      ) : (
        <form action={unAction} className="space-y-4">
          {next && <input type="hidden" name="next" value={next} />}
          <div>
            <label className="label">ชื่อผู้ใช้ (Username)</label>
            <input name="username" type="text" autoCapitalize="none" autoComplete="username" className="field" placeholder="ชื่อผู้ใช้ที่เจ้าของสร้างให้" required autoFocus />
          </div>
          <div>
            <label className="label">รหัสผ่าน</label>
            <input name="password" type="password" autoComplete="current-password" className="field" placeholder="รหัสผ่าน" required />
          </div>
          {unState?.error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{unState.error}</p>
          )}
          <SubmitButton label="เข้าสู่ระบบ" />
          <p className="text-center text-xs text-slate-400">
            ทีมงานเข้าระบบด้วยบัญชีที่เจ้าของกิจการสร้างให้ — ลืมรหัส ติดต่อเจ้าของ
          </p>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-slate-500">
        ยังไม่มีบัญชี?{" "}
        <Link href={signupHref} className="font-medium text-indigo-600 hover:text-indigo-700">
          สมัครใช้งานฟรี
        </Link>
      </p>
    </div>
  );
}
