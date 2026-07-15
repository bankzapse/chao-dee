"use client";

import { useState } from "react";
import Link from "next/link";
import { PACKAGES, COMMON_FEATURES, type Package } from "@/lib/packages";
import { COMPANY } from "@/lib/company";

export function Pricing({ packages = PACKAGES }: { packages?: Package[] }) {
  const [yearly, setYearly] = useState(true);

  return (
    <section id="pricing" className="bg-slate-950">
      <div className="mx-auto max-w-6xl px-6 pb-24">
        <div className="border-t border-white/10 pt-16 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-amber-300">
            แพ็คเกจ
          </p>
          <h2 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
            เลือกแพ็คเกจที่เหมาะกับหอของคุณ
          </h2>
          <p className="mt-3 text-slate-400">
            ทุกแพ็คเกจได้ฟีเจอร์ครบ · ต่างกันแค่จำนวนอาคาร/ห้อง/ผู้เช่า · ทดลองฟรี 30 วัน
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {COMPANY.vatRegistered
              ? "ราคารวมภาษีมูลค่าเพิ่ม (VAT 7%) แล้ว"
              : "ราคายังไม่รวมภาษีมูลค่าเพิ่ม (ผู้ประกอบการยังไม่ได้จดทะเบียน VAT)"}
          </p>

          {/* toggle */}
          <div className="mt-6 inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1">
            <button
              onClick={() => setYearly(false)}
              className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                !yearly ? "bg-white text-slate-900 shadow-sm" : "text-slate-300"
              }`}
            >
              รายเดือน
            </button>
            <button
              onClick={() => setYearly(true)}
              className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                yearly ? "bg-white text-slate-900 shadow-sm" : "text-slate-300"
              }`}
            >
              รายปี{" "}
              <span className="ml-1 rounded-full bg-amber-300/15 px-2 py-0.5 text-xs text-amber-300">
                คุ้มที่สุด!
              </span>
            </button>
          </div>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {packages.map((p) => {
            const isCustom = p.priceMonthly === null;
            const perMonth = yearly ? p.priceYearlyPerMonth : p.priceMonthly;
            return (
              <div
                key={p.slug}
                className={`relative flex flex-col rounded-2xl border p-8 ${
                  p.highlight
                    ? "border-amber-300/40 bg-gradient-to-b from-amber-300/[0.07] to-white/[0.02] shadow-xl shadow-black/40 ring-1 ring-amber-300/20"
                    : "border-white/10 bg-white/[0.04]"
                }`}
              >
                {p.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-300 to-amber-400 px-3 py-1 text-xs font-semibold text-slate-900">
                    แนะนำ
                  </span>
                )}
                <h3 className="text-xl font-bold text-white">{p.name}</h3>
                <p className="mt-1 text-sm text-slate-400">{p.tagline}</p>

                <div className="mt-5 min-h-[92px]">
                  {isCustom ? (
                    <>
                      <p className="text-3xl font-bold text-white">ติดต่อเรา</p>
                      <p className="mt-1 text-sm text-slate-400">ราคาตามการใช้งานจริง</p>
                    </>
                  ) : (
                    <>
                      {yearly && (
                        <span className="inline-block rounded bg-amber-300/15 px-2 py-0.5 text-xs font-medium text-amber-300">
                          รายปี · คุ้มที่สุด!
                        </span>
                      )}
                      <p className="mt-1 flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-white">
                          ฿{perMonth?.toLocaleString()}
                        </span>
                        <span className="text-slate-400">/เดือน</span>
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {yearly
                          ? `ชำระ ฿${p.priceYearlyTotal?.toLocaleString()} ต่อปี`
                          : "ชำระเป็นรายเดือน"}
                      </p>
                    </>
                  )}
                </div>

                <div className="mt-5 space-y-2 border-y border-white/10 py-5 text-sm">
                  <Limit label="อาคาร" value={p.limits.buildings} />
                  <Limit label="ห้องพัก" value={p.limits.rooms} />
                  <Limit label="ผู้เช่า" value={p.limits.tenants} />
                </div>

                <ul className="mt-5 flex-1 space-y-2 text-sm text-slate-300">
                  {COMMON_FEATURES.slice(0, 7).map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="text-emerald-400">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href={isCustom ? "#contact" : "/signup"}
                  className={`mt-7 rounded-xl px-4 py-3 text-center text-sm font-semibold transition ${
                    p.highlight
                      ? "bg-gradient-to-r from-amber-300 to-amber-400 text-slate-900 hover:from-amber-200 hover:to-amber-300"
                      : "border border-white/20 text-slate-100 hover:bg-white/10"
                  }`}
                >
                  {p.cta}
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Limit({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}
