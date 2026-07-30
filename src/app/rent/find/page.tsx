import Link from "next/link";
import type { Metadata } from "next";
import { Sparkles, Zap, Home } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { IconBadge } from "@/components/icon-badge";
import { getProvinces } from "@/lib/thai-geo";
import { RequestForm } from "./request-form";

export const metadata: Metadata = {
  title: "ให้เราหาห้องให้ฟรี | Chao-Dee Rent",
  description:
    "บอกงบและทำเลที่ต้องการ ทีมงาน Chao-Dee หาห้องเช่าที่ตรงใจให้ฟรี ไม่มีค่าใช้จ่ายสำหรับผู้เช่า",
};

export default function FindRoomPage() {
  const provinces = getProvinces();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-800/10 bg-slate-900 text-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-3">
          <Link href="/rent" className="flex items-center gap-2">
            <BrandMark size={30} />
            <span className="font-bold">
              Chao-Dee <span className="font-light text-amber-300">Rent</span>
            </span>
          </Link>
          <Link href="/rent" className="text-sm text-slate-300 hover:text-white">
            ← ดูประกาศทั้งหมด
          </Link>
        </div>
      </header>

      {/* hero */}
      <section className="bg-slate-900 text-white">
        <div className="mx-auto max-w-4xl px-5 pb-14 pt-10 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-300/15 px-3 py-1 text-xs font-medium text-amber-200">
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2} /> ฟรีสำหรับผู้เช่า · ไม่มีค่าใช้จ่าย
          </span>
          <h1 className="mt-4 text-3xl font-extrabold leading-snug sm:text-4xl">
            หาห้องไม่เจอ? <span className="text-amber-300">ให้เราหาให้</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-slate-300">
            บอกงบ ทำเล และสิ่งที่ต้องการ — ทีมงาน Chao-Dee จะคัดห้องที่ตรงใจแล้วติดต่อกลับ
            พร้อมพาดูห้อง ไม่เสียค่าบริการใด ๆ
          </p>
        </div>
      </section>

      {/* form */}
      <section className="mx-auto -mt-8 max-w-2xl px-5 pb-16">
        <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200 sm:p-8">
          <RequestForm provinces={provinces} />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            { icon: Sparkles, tone: "emerald" as const, t: "ฟรี 100%", d: "ผู้เช่าไม่เสียค่านายหน้า" },
            { icon: Zap, tone: "amber" as const, t: "ตอบไว", d: "ทีมงานติดต่อกลับโดยเร็ว" },
            { icon: Home, tone: "indigo" as const, d: "คัดจากห้องว่างจริงในระบบ", t: "ห้องอัปเดตจริง" },
          ].map((f) => (
            <div key={f.t} className="rounded-xl border border-slate-200 bg-white p-4 text-center">
              <div className="flex justify-center">
                <IconBadge icon={f.icon} tone={f.tone} size="md" />
              </div>
              <p className="mt-1 font-semibold text-slate-900">{f.t}</p>
              <p className="text-xs text-slate-500">{f.d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
