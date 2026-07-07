import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isPlatformAdmin } from "@/lib/admin";
import { BrandMark } from "@/components/brand-mark";
import { OwnerLoginForm } from "./owner-login-form";

export const metadata: Metadata = {
  title: "แผงเจ้าของระบบ · Chao-Dee",
  robots: { index: false, follow: false },
};

export default async function OwnerLoginPage() {
  // ถ้าเป็นแอดมินอยู่แล้ว ข้ามไป /owner
  if (await isPlatformAdmin()) redirect("/owner");

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex w-fit items-center justify-center">
            <BrandMark size={52} />
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
