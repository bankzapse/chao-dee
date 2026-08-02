"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronDown, ChevronUp, X, Rocket, ArrowRight } from "lucide-react";

export type OnboardingStep = {
  key: string;
  label: string;
  desc: string;
  href: string;
  cta: string;
  done: boolean;
};

const LS_KEY = "chaodee_onboarding_v1"; // เก็บสถานะ: "collapsed" | "dismissed"

/**
 * การ์ด "เริ่มต้นใช้งาน" บนแดชบอร์ด — ไล่ 6 ขั้นตั้งค่าหอ
 * - ติ๊กอัตโนมัติจากข้อมูลจริง (done ส่งมาจาก server)
 * - ย่อ/ขยายได้ (จำค่าไว้) · ซ่อนถาวรได้เมื่อทำครบแล้ว
 */
export function OnboardingChecklist({ steps }: { steps: OnboardingStep[] }) {
  const total = steps.length;
  const done = steps.filter((s) => s.done).length;
  const allDone = done === total;

  // เริ่มด้วยค่า default (ตรงกับ server → ไม่ mismatch) แล้ว sync จาก localStorage หลัง mount
  // ไม่ใช้ "ready gate" เพื่อให้การ์ดแสดงทันทีแม้ hydration ช้า (แล้วค่อยซ่อน/ย่อถ้าเคยตั้งไว้)
  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const v = localStorage.getItem(LS_KEY);
    if (v === "dismissed") setDismissed(true);
    else if (v === "collapsed") setCollapsed(true);
  }, []);

  function hide() {
    setDismissed(true);
    localStorage.setItem(LS_KEY, "dismissed");
  }
  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    // ไม่ทับสถานะ dismissed; เก็บแค่ย่อ/ปกติ
    localStorage.setItem(LS_KEY, next ? "collapsed" : "open");
  }

  if (dismissed) return null;

  const pct = Math.round((done / total) * 100);

  return (
    <div className="card mb-6 overflow-hidden">
      {/* หัวการ์ด */}
      <div className="flex items-center gap-3 p-4 sm:p-5">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ${
            allDone ? "bg-gradient-to-br from-emerald-500 to-teal-600" : "bg-gradient-to-br from-indigo-500 to-violet-600"
          }`}
        >
          {allDone ? <CheckCircle2 className="h-6 w-6" strokeWidth={2.2} /> : <Rocket className="h-6 w-6" strokeWidth={2.2} />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-base font-semibold text-slate-900">
              {allDone ? "ตั้งค่าครบแล้ว พร้อมใช้งาน 🎉" : "เริ่มต้นใช้งาน Chao-Dee"}
            </h2>
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500 tabular-nums">
              {done}/{total}
            </span>
          </div>
          {/* progress bar */}
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all duration-500 ${allDone ? "bg-emerald-500" : "bg-gradient-to-r from-indigo-500 to-violet-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={toggle}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label={collapsed ? "ขยาย" : "ย่อ"}
          >
            {collapsed ? <ChevronDown className="h-5 w-5" strokeWidth={2} /> : <ChevronUp className="h-5 w-5" strokeWidth={2} />}
          </button>
          {allDone && (
            <button
              onClick={hide}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              aria-label="ซ่อน"
            >
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {/* รายการขั้นตอน */}
      {!collapsed && (
        <ol className="divide-y divide-slate-100 border-t border-slate-100">
          {steps.map((s, i) => (
            <li key={s.key} className="flex items-center gap-3 px-4 py-3 sm:px-5">
              <div className="shrink-0">
                {s.done ? (
                  <CheckCircle2 className="h-7 w-7 text-emerald-500" strokeWidth={2} />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-slate-200 text-sm font-bold text-slate-400 tabular-nums">
                    {i + 1}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-semibold ${s.done ? "text-slate-400 line-through decoration-slate-300" : "text-slate-900"}`}>
                  {s.label}
                </p>
                {!s.done && <p className="text-xs text-slate-400">{s.desc}</p>}
              </div>
              {s.done ? (
                <span className="shrink-0 text-xs font-medium text-emerald-600">เสร็จแล้ว</span>
              ) : (
                <Link
                  href={s.href}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-100"
                >
                  {s.cta}
                  <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.4} />
                </Link>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
