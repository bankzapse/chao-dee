"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ownerLogin, type OwnerAuthState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
      disabled={pending}
    >
      {pending ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
    </button>
  );
}

export function OwnerLoginForm() {
  const [state, action] = useActionState<OwnerAuthState, FormData>(ownerLogin, null);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-300">เบอร์โทรศัพท์</label>
        <input
          name="phone"
          type="tel"
          inputMode="numeric"
          placeholder="0812345678"
          required
          autoFocus
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-300">รหัสผ่าน</label>
        <input
          name="password"
          type="password"
          placeholder="••••••••"
          required
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500"
        />
      </div>

      {state?.error && (
        <p className="rounded-lg bg-rose-950/60 px-3 py-2 text-sm text-rose-300">{state.error}</p>
      )}
      <SubmitButton />
      <a
        href="/forgot-password"
        className="block text-center text-sm text-slate-400 transition hover:text-slate-200"
      >
        ลืมรหัสผ่าน? รีเซ็ตด้วย OTP
      </a>
    </form>
  );
}
