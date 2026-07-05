import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OwnerLoginForm } from "./owner-login-form";

export const metadata: Metadata = {
  title: "แผงเจ้าของระบบ · Chao-Dee",
  robots: { index: false, follow: false },
};

export default async function OwnerLoginPage() {
  // ถ้าเป็นแอดมินอยู่แล้ว ข้ามไป /owner
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("is_platform_admin")
      .eq("id", user.id)
      .single();
    if (data?.is_platform_admin) redirect("/owner");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-2xl font-bold text-white">
            CD
          </div>
          <h1 className="text-xl font-bold text-white">แผงเจ้าของระบบ</h1>
          <p className="mt-1 text-sm text-slate-400">สำหรับทีมงาน Chao-Dee เท่านั้น</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
          <OwnerLoginForm />
        </div>
        <p className="mt-6 text-center text-xs text-slate-600">
          ผู้ใช้ทั่วไปเข้าระบบที่{" "}
          <a href="/login" className="text-slate-400 hover:text-slate-300">
            หน้าเข้าสู่ระบบหลัก
          </a>
        </p>
      </div>
    </div>
  );
}
