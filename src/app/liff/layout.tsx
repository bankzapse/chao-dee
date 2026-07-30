import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chao-Dee สำหรับผู้เช่า",
  robots: { index: false, follow: false },
};

// LIFF เปิดใน webview ของ LINE — ทุกหน้าต้องสดเสมอ (ข้อมูลบิล/ซ่อมเปลี่ยนตลอด)
export const dynamic = "force-dynamic";

export default function LiffLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-md bg-slate-50 px-4 py-5">{children}</div>
  );
}
