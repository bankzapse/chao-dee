"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { signIn, signUp, type AuthState } from "./actions";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "กำลังดำเนินการ…" : label}
    </button>
  );
}

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const action = mode === "signin" ? signIn : signUp;
  const [state, formAction] = useActionState<AuthState, FormData>(action, null);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-slate-100 p-4">
      <div className="card w-full max-w-md p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-xl font-bold text-white">
            ช
          </div>
          <h1 className="text-2xl font-bold text-slate-900">ChaoDee</h1>
          <p className="mt-1 text-sm text-slate-500">
            หอพัก · คอนโด · อพาร์ตเมนต์
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
          <button
            onClick={() => setMode("signin")}
            className={`rounded-md py-2 text-sm font-medium transition ${
              mode === "signin"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500"
            }`}
          >
            เข้าสู่ระบบ
          </button>
          <button
            onClick={() => setMode("signup")}
            className={`rounded-md py-2 text-sm font-medium transition ${
              mode === "signup"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500"
            }`}
          >
            สมัครใช้งาน
          </button>
        </div>

        <form action={formAction} className="space-y-4">
          {mode === "signup" && (
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
            <label className="label">อีเมล</label>
            <input
              name="email"
              type="email"
              className="field"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="label">รหัสผ่าน</label>
            <input
              name="password"
              type="password"
              className="field"
              placeholder="อย่างน้อย 6 ตัวอักษร"
              required
            />
          </div>

          {state?.error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">
              {state.error}
            </p>
          )}

          <SubmitButton label={mode === "signin" ? "เข้าสู่ระบบ" : "สมัครและเริ่มใช้งาน"} />
        </form>
      </div>
    </div>
  );
}
