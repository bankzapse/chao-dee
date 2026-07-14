import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BrandMark } from "@/components/brand-mark";
import { LoginForm } from "@/app/login/login-form";

export const metadata = {
  title: "เข้าสู่ระบบ | Chao-Dee Rent",
  robots: { index: false },
};

const SIDE_IMAGE =
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1000&q=80";

export default async function RentLoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/rent/manage");

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-4 sm:p-6">
      {/* พื้นหลังภาพ + gradient */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={SIDE_IMAGE} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/90 via-slate-900/85 to-indigo-950/80" />
      <div className="absolute -right-24 top-10 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl" />
      <div className="absolute -left-20 bottom-0 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl" />

      {/* ลิงก์กลับเว็บหลัก */}
      <Link
        href="/"
        className="absolute left-5 top-5 z-10 flex items-center gap-1.5 text-sm text-slate-300 hover:text-white"
      >
        ← ไประบบจัดการหอพัก
      </Link>

      {/* การ์ดแยกซ้าย-ขวา */}
      <div className="relative grid w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl lg:grid-cols-2">
        {/* ซ้าย: ภาพ + แบรนด์ */}
        <div className="relative hidden flex-col justify-between p-10 text-white lg:flex">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={SIDE_IMAGE} alt="ห้องเช่า" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/70 to-slate-900/40" />
          <Link href="/rent" className="relative flex items-center gap-2">
            <span className="rounded-xl bg-white/95 p-1.5">
              <BrandMark size={30} />
            </span>
            <span className="text-lg font-bold">
              Chao-Dee <span className="font-light text-amber-300">Rent</span>
            </span>
          </Link>
          <div className="relative">
            <h2 className="text-3xl font-bold leading-snug">
              จัดการประกาศ
              <br />
              ห้องเช่าของคุณ
            </h2>
            <ul className="mt-5 space-y-2 text-sm text-slate-200">
              <li>🏢 ลงประกาศ / แก้ไขได้ไม่จำกัด</li>
              <li>📥 ดูผู้สนใจที่ติดต่อเข้ามา</li>
              <li>⭐ ซื้อโปรโมทดันขึ้นบนสุด</li>
            </ul>
            <p className="mt-5 text-xs text-slate-400">ลูกค้า Chao-Dee ใช้บัญชีเดิมเข้าได้เลย</p>
          </div>
        </div>

        {/* ขวา: ฟอร์มเข้าสู่ระบบ */}
        <div className="flex items-center justify-center p-8 sm:p-10">
          <div className="w-full max-w-sm">
            <div className="mb-6 flex items-center gap-2 lg:hidden">
              <BrandMark size={30} />
              <span className="font-bold text-slate-900">
                Chao-Dee <span className="font-light text-amber-500">Rent</span>
              </span>
            </div>
            <LoginForm next="/rent/manage" signupHref="/rent/signup" />
          </div>
        </div>
      </div>
    </div>
  );
}
