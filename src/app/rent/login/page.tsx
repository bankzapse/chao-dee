import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BrandMark } from "@/components/brand-mark";
import { LoginForm } from "@/app/login/login-form";

export const metadata = {
  title: "เข้าสู่ระบบ | Chao-Dee Rent",
  robots: { index: false },
};

export default async function RentLoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/rent/manage");

  return (
    <div className="flex min-h-screen bg-slate-900">
      <div className="hidden w-1/2 flex-col justify-between p-12 text-white lg:flex">
        <Link href="/rent" className="flex items-center gap-2">
          <BrandMark size={34} />
          <span className="text-xl font-bold">Chao-Dee <span className="font-light text-amber-300">Rent</span></span>
        </Link>
        <div>
          <h2 className="text-3xl font-bold leading-snug">
            จัดการประกาศ<br />ห้องเช่าของคุณ
          </h2>
          <p className="mt-3 max-w-sm text-slate-300">
            เข้าสู่ระบบเพื่อลงประกาศ แก้ไข และดูผู้ที่สนใจติดต่อ — ลูกค้า Chao-Dee ใช้บัญชีเดิมได้เลย
          </p>
        </div>
        <p className="text-xs text-slate-500">chao-dee.com/rent</p>
      </div>

      <main className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
          <div className="mb-2 flex items-center justify-between lg:hidden">
            <Link href="/rent" className="flex items-center gap-2">
              <BrandMark size={28} />
              <span className="font-bold text-slate-900">Chao-Dee Rent</span>
            </Link>
          </div>
          <LoginForm next="/rent/manage" signupHref="/rent/signup" />
        </div>
      </main>
    </div>
  );
}
