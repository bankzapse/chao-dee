import type { Metadata } from "next";
import { readLiffSession } from "@/lib/liff";
import { LiffBoot } from "./liff-boot";

export const metadata: Metadata = {
  title: "Chao-Dee สำหรับผู้เช่า",
  robots: { index: false, follow: false },
};

// LIFF เปิดใน webview ของ LINE — ทุกหน้าต้องสดเสมอ (ข้อมูลบิล/ซ่อมเปลี่ยนตลอด)
export const dynamic = "force-dynamic";

export default async function LiffLayout({ children }: { children: React.ReactNode }) {
  const sess = await readLiffSession();
  return (
    <div className="liff-shell mx-auto min-h-screen max-w-md bg-slate-50 px-4 py-5">
      {/* liff.init() ต้องรันทุกหน้า ไม่งั้น LINE ค้างหน้า loading */}
      <LiffBoot liffId={process.env.NEXT_PUBLIC_LIFF_ID ?? ""} hasSession={Boolean(sess)} />
      {children}
    </div>
  );
}
