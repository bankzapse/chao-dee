import Link from "next/link";
import { SignupForm } from "./signup-form";
import { getProvinces } from "@/lib/thai-geo";

export const metadata = { title: "สมัครใช้งาน" };

const POINTS = [
  { icon: "🤖", text: "จดมิเตอร์ด้วย AI + ออกบิลอัตโนมัติ" },
  { icon: "💸", text: "รับเงินผ่าน PromptPay QR ในบิล" },
  { icon: "💬", text: "ผู้เช่าเช็คยอด/แจ้งซ่อมผ่าน LINE" },
  { icon: "📊", text: "แดชบอร์ด & รายงานเรียลไทม์" },
];

export default function SignupPage() {
  const provinces = getProvinces();

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* ---- แผงแบรนด์ (ซ้าย) ---- */}
      <aside className="relative hidden w-2/5 flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-600 to-cyan-500 p-10 text-white lg:flex">
        <div className="absolute -right-16 top-10 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl" />

        <Link href="/" className="relative flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-xl font-bold">CD</span>
          <span className="text-xl font-bold">Chao-Dee</span>
        </Link>

        <div className="relative">
          <p className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-medium">🎉 ทดลองฟรี 30 วัน · ไม่ต้องผูกบัตร</p>
          <h2 className="mt-4 text-3xl font-bold leading-snug">
            เริ่มจัดการหอพัก<br />ให้เป็นระบบใน 3 นาที
          </h2>
          <ul className="mt-7 space-y-3">
            {POINTS.map((p) => (
              <li key={p.text} className="flex items-center gap-3 text-indigo-50">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15 text-base">{p.icon}</span>
                {p.text}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative rounded-2xl bg-white/10 p-5 backdrop-blur">
          <p className="text-sm text-indigo-50">“ตั้งค่าครั้งเดียว ออกบิลทั้งตึกในคลิกเดียว ผู้เช่าจ่ายเร็วขึ้นมาก”</p>
          <p className="mt-2 text-xs font-medium text-white">— คุณสมชาย · เจ้าของหอพัก 45 ห้อง</p>
        </div>
      </aside>

      {/* ---- ฟอร์ม (ขวา) ---- */}
      <main className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <Link href="/" className="flex items-center gap-2 lg:invisible">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white">CD</span>
            <span className="font-bold text-slate-900">Chao-Dee</span>
          </Link>
          <div className="flex items-center gap-4 text-sm font-medium">
            <Link href="/" className="text-slate-500 hover:text-slate-800">← หน้าแรก</Link>
            <Link href="/login" className="text-indigo-600 hover:text-indigo-700">เข้าสู่ระบบ</Link>
          </div>
        </header>

        <div className="flex flex-1 items-start justify-center overflow-y-auto px-6 py-10">
          <div className="w-full max-w-xl">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-900">สมัครใช้งาน Chao-Dee</h1>
              <p className="mt-1 text-sm text-slate-500">กรอกไม่กี่ขั้นตอน แล้วเริ่มใช้ได้ทันที</p>
            </div>
            <div className="card p-6 sm:p-8">
              <SignupForm provinces={provinces} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
