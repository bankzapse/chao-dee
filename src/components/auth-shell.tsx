import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

const POINTS = [
  "จดมิเตอร์ด้วย AI + ออกบิลอัตโนมัติ",
  "รับเงินผ่าน PromptPay QR",
  "ผู้เช่าเช็คยอด/แจ้งซ่อมผ่าน LINE",
  "รายงาน & แดชบอร์ดเรียลไทม์",
];

/** เลย์เอาต์ auth แบบ split-screen: แผงแบรนด์ (ซ้าย) + ฟอร์ม (ขวา) */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* ---- แผงแบรนด์ (ซ่อนบนมือถือ) ---- */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-600 to-cyan-500 p-12 text-white lg:flex">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-20 -left-10 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl" />

        <Link href="/" className="relative flex items-center gap-2.5">
          <span className="rounded-2xl bg-white p-1.5 shadow-sm">
            <BrandMark size={34} />
          </span>
          <span className="text-xl font-bold">Chao-Dee</span>
        </Link>

        <div className="relative">
          <h2 className="text-3xl font-bold leading-snug">
            จัดการหอพัก คอนโด อพาร์ตเมนต์<br />ครบวงจรในที่เดียว
          </h2>
          <ul className="mt-8 space-y-3">
            {POINTS.map((p) => (
              <li key={p} className="flex items-center gap-3 text-indigo-50">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm">
                  ✓
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative rounded-2xl bg-white/10 p-5 backdrop-blur">
          <p className="text-indigo-50">
            “เมื่อก่อนทำบิลทั้งวัน ตอนนี้ครึ่งชั่วโมงเสร็จ ผู้เช่าจ่ายเร็วขึ้นด้วย”
          </p>
          <p className="mt-2 text-sm font-medium text-white">— คุณสมชาย · เจ้าของหอพัก 45 ห้อง</p>
        </div>
      </div>

      {/* ---- ฟอร์ม ---- */}
      <div className="relative flex w-full flex-col items-center justify-center bg-slate-50 px-6 py-12 lg:w-1/2">
        {/* ปุ่มกลับหน้าแรก */}
        <Link
          href="/"
          className="absolute left-5 top-5 flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          ← กลับหน้าแรก
        </Link>
        {/* โลโก้บนมือถือ */}
        <Link href="/" className="mb-8 flex items-center gap-2 lg:hidden">
          <BrandMark size={40} />
          <span className="text-xl font-bold text-slate-900">Chao-Dee</span>
        </Link>
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
