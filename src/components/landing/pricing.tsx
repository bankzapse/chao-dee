"use client";

import { useState } from "react";
import Link from "next/link";
import { PACKAGES, COMMON_FEATURES } from "@/lib/packages";

export function Pricing() {
  const [yearly, setYearly] = useState(true);

  return (
    <section id="pricing" className="mx-auto max-w-6xl px-6 py-20">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
          แพ็คเกจ
        </p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
          เลือกแพ็คเกจที่เหมาะกับหอของคุณ
        </h2>
        <p className="mt-3 text-slate-500">
          ทุกแพ็คเกจได้ฟีเจอร์ครบ · ต่างกันแค่จำนวนอาคาร/ห้อง/ผู้เช่า · ทดลองฟรี 30 วัน
        </p>

        {/* toggle */}
        <div className="mt-6 inline-flex items-center gap-3 rounded-full bg-slate-100 p-1">
          <button
            onClick={() => setYearly(false)}
            className={`rounded-full px-5 py-2 text-sm font-medium transition ${
              !yearly ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
            }`}
          >
            รายเดือน
          </button>
          <button
            onClick={() => setYearly(true)}
            className={`rounded-full px-5 py-2 text-sm font-medium transition ${
              yearly ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
            }`}
          >
            รายปี <span className="text-emerald-600">ประหยัดกว่า</span>
          </button>
        </div>
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {PACKAGES.map((p) => {
          const price = yearly ? p.priceYearly : p.priceMonthly;
          return (
            <div
              key={p.slug}
              className={`relative flex flex-col rounded-2xl border p-8 ${
                p.highlight
                  ? "border-indigo-300 bg-gradient-to-b from-indigo-50/60 to-white shadow-xl shadow-indigo-100 ring-1 ring-indigo-200"
                  : "border-slate-200 bg-white shadow-sm"
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white">
                  แนะนำ
                </span>
              )}
              <h3 className="text-xl font-bold text-slate-900">{p.name}</h3>
              <p className="mt-1 text-sm text-slate-500">{p.tagline}</p>

              <div className="mt-5">
                {price === null ? (
                  <p className="text-3xl font-bold text-slate-900">ติดต่อเรา</p>
                ) : (
                  <p className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-slate-900">
                      ฿{price.toLocaleString()}
                    </span>
                    <span className="text-slate-500">/เดือน</span>
                  </p>
                )}
                {price !== null && yearly && (
                  <p className="mt-1 text-xs text-emerald-600">
                    จ่ายรายปี · จากปกติ ฿{p.priceMonthly?.toLocaleString()}/เดือน
                  </p>
                )}
              </div>

              <div className="mt-5 space-y-2 border-y border-slate-100 py-5 text-sm">
                <Limit label="อาคาร" value={p.limits.buildings} />
                <Limit label="ห้องพัก" value={p.limits.rooms} />
                <Limit label="ผู้เช่า" value={p.limits.tenants} />
              </div>

              <ul className="mt-5 flex-1 space-y-2 text-sm text-slate-600">
                {COMMON_FEATURES.slice(0, 6).map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-emerald-500">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/login"
                className={`mt-7 rounded-xl px-4 py-3 text-center text-sm font-semibold transition ${
                  p.highlight
                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                    : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {p.cta}
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Limit({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}
