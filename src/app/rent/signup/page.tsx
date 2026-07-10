import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BrandMark } from "@/components/brand-mark";
import { SignupForm } from "@/app/signup/signup-form";
import { getProvinces } from "@/lib/thai-geo";

export const metadata = {
  title: "สมัครลงประกาศให้เช่า | Chao-Dee Rent",
  robots: { index: false },
};

export default async function RentSignupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/rent/manage");

  const provinces = getProvinces();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="relative hidden w-2/5 flex-col justify-between overflow-hidden bg-slate-900 p-10 text-white lg:flex">
        <div className="absolute -right-16 top-10 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl" />
        <Link href="/rent" className="relative flex items-center gap-2.5">
          <span className="rounded-2xl bg-white p-1.5 shadow-sm">
            <BrandMark size={34} />
          </span>
          <span className="text-xl font-bold">Chao-Dee <span className="font-light text-amber-300">Rent</span></span>
        </Link>
        <div className="relative">
          <p className="inline-flex rounded-full bg-amber-400/20 px-3 py-1 text-xs font-medium text-amber-200">
            ลงประกาศฟรี · ไม่จำกัดจำนวน
          </p>
          <h2 className="mt-4 text-3xl font-bold leading-snug">
            มีห้องให้เช่า?<br />ลงประกาศถึงผู้เช่าจริง
          </h2>
          <ul className="mt-7 space-y-3 text-slate-300">
            <li className="flex items-center gap-3">🏢 ลงประกาศหอพัก คอนโด อพาร์ตเมนต์</li>
            <li className="flex items-center gap-3">📥 รับผู้สนใจติดต่อตรงถึงคุณ</li>
            <li className="flex items-center gap-3">⭐ ซื้อโปรโมทดันขึ้นบนสุดได้</li>
            <li className="flex items-center gap-3">🔧 อัปเกรดเป็นระบบจัดการหอครบวงจร</li>
          </ul>
        </div>
        <p className="relative text-xs text-slate-500">ลูกค้า Chao-Dee เดิม เข้าสู่ระบบด้วยบัญชีเดิมได้เลย</p>
      </aside>

      <main className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <Link href="/rent" className="flex items-center gap-2 lg:invisible">
            <BrandMark size={32} />
            <span className="font-bold text-slate-900">Chao-Dee Rent</span>
          </Link>
          <div className="flex items-center gap-4 text-sm font-medium">
            <Link href="/rent" className="text-slate-500 hover:text-slate-800">← หน้าประกาศ</Link>
            <Link href="/rent/login" className="text-indigo-600 hover:text-indigo-700">เข้าสู่ระบบ</Link>
          </div>
        </header>

        <div className="flex flex-1 items-start justify-center overflow-y-auto px-6 py-10">
          <div className="w-full max-w-xl">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-900">สมัครเพื่อลงประกาศให้เช่า</h1>
              <p className="mt-1 text-sm text-slate-500">
                กรอกข้อมูลที่พักไม่กี่ขั้นตอน แล้วลงประกาศได้ทันที — ฟรี
              </p>
            </div>
            <div className="card p-6 sm:p-8">
              <SignupForm provinces={provinces} next="/rent/manage" source="rent" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
