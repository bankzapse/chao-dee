import Link from "next/link";
import { Pricing } from "@/components/landing/pricing";
import { HeaderCta } from "@/components/landing/header-cta";

const FEATURES = [
  { icon: "📊", title: "แดชบอร์ด & รายงาน", desc: "ภาพรวมรายได้ อัตราเข้าพัก ลูกหนี้ กราฟวิเคราะห์แบบเรียลไทม์" },
  { icon: "🤖", title: "AI อ่านมิเตอร์", desc: "ถ่ายรูปหน้าปัด แล้ว AI อ่านค่าให้อัตโนมัติ พร้อมตรวจจับค่าผิดปกติ" },
  { icon: "🧾", title: "ออกบิลอัตโนมัติ", desc: "รวมค่าเช่า+น้ำ+ไฟ ออกบิลทั้งตึกในคลิกเดียว แนบ PromptPay QR" },
  { icon: "💬", title: "เชื่อม LINE ผู้เช่า", desc: "ส่งบิล เช็คยอดค้าง แจ้งซ่อม แจ้งพัสดุ และประกาศ ผ่าน LINE OA" },
  { icon: "🗺️", title: "ผังห้องตามจริง", desc: "เห็นสถานะทุกห้องเป็นภาพ — ว่าง/มีผู้เช่า/ค้างชำระ ในหน้าเดียว" },
  { icon: "📄", title: "สัญญา & ผู้เช่า", desc: "จัดการสัญญาเช่า เงินประกัน แจ้งเตือนสัญญาใกล้หมด ไม่จำกัด" },
  { icon: "🔧", title: "แจ้งซ่อม & พัสดุ", desc: "รับแจ้งซ่อมและพัสดุผ่าน LINE ติดตามสถานะงานครบ" },
  { icon: "📱", title: "แอปมือถือ", desc: "จดมิเตอร์หน้างาน ดูแดชบอร์ด อนุมัติงาน ได้จากมือถือ" },
];

const STEPS = [
  { n: "1", title: "เพิ่มอาคารและห้อง", desc: "ตั้งค่าห้อง ค่าเช่า ค่าน้ำ-ไฟ ครั้งเดียว" },
  { n: "2", title: "ผูกผู้เช่า + LINE", desc: "ทำสัญญา ผู้เช่าเชื่อม LINE ด้วยรหัส" },
  { n: "3", title: "จดมิเตอร์ & ออกบิล", desc: "AI ช่วยอ่าน ออกบิลทั้งตึกอัตโนมัติ" },
  { n: "4", title: "รับเงิน & ดูรายงาน", desc: "ผู้เช่าจ่ายผ่าน PromptPay ระบบสรุปให้" },
];

const TESTIMONIALS = [
  { name: "คุณสมชาย", role: "เจ้าของหอพัก 45 ห้อง", text: "เมื่อก่อนจดมิเตอร์+ทำบิลทั้งวัน ตอนนี้ครึ่งชั่วโมงเสร็จ ผู้เช่าจ่ายเงินเร็วขึ้นด้วย" },
  { name: "คุณสุดา", role: "อพาร์ตเมนต์ 3 อาคาร", text: "ชอบที่ผู้เช่าเช็คยอดผ่าน LINE เองได้ โทรถามน้อยลงมาก งานเบาขึ้นเยอะ" },
  { name: "คุณอนันต์", role: "คอนโดให้เช่า 120 ยูนิต", text: "รายงานชัดเจน รู้ทันทีว่าใครค้างจ่าย AI อ่านมิเตอร์แม่นเกินคาด" },
];

const FAQ = [
  { q: "ต้องติดตั้งโปรแกรมไหม?", a: "ไม่ต้อง ใช้งานผ่านเว็บได้ทันทีทุกอุปกรณ์ และมีแอปมือถือสำหรับเจ้าของ" },
  { q: "ผู้เช่าต้องโหลดแอปไหม?", a: "ไม่ต้อง ผู้เช่าใช้งานผ่าน LINE ที่มีอยู่แล้ว — เช็คยอด แจ้งซ่อม รับพัสดุได้เลย" },
  { q: "ข้อมูลปลอดภัยแค่ไหน?", a: "ข้อมูลแยกตามกิจการด้วยระบบความปลอดภัยระดับฐานข้อมูล (RLS) เข้ารหัส HTTPS ทั้งหมด" },
  { q: "ทดลองใช้ได้ไหม?", a: "ได้ ทดลองฟรี 30 วัน ไม่ต้องผูกบัตร ยกเลิกได้ทุกเมื่อ" },
];

export default function LandingPage() {
  return (
    <div className="bg-white text-slate-800">
      {/* ===== NAV ===== */}
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white">
              ช
            </div>
            <span className="text-lg font-bold text-slate-900">ChaoDee</span>
          </div>
          <div className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#features" className="hover:text-slate-900">ฟีเจอร์</a>
            <a href="#how" className="hover:text-slate-900">วิธีใช้งาน</a>
            <a href="#pricing" className="hover:text-slate-900">ราคา</a>
            <a href="#faq" className="hover:text-slate-900">คำถามที่พบบ่อย</a>
          </div>
          <HeaderCta />
        </nav>
      </header>

      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-indigo-50 via-cyan-50/40 to-white" />
        <div className="absolute right-0 top-0 -z-10 h-96 w-96 rounded-full bg-indigo-200/30 blur-3xl" />
        <div className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-medium text-indigo-700">
                🎉 ทดลองฟรี 30 วัน · ไม่ต้องผูกบัตร
              </span>
              <h1 className="mt-5 text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
                จัดการหอพัก คอนโด<br />
                อพาร์ตเมนต์{" "}
                <span className="bg-gradient-to-r from-indigo-600 to-cyan-500 bg-clip-text text-transparent">
                  ครบวงจร
                </span>
                <br />ในที่เดียว
              </h1>
              <p className="mt-5 text-lg text-slate-600">
                เปลี่ยนงานวุ่นวายให้เป็นระบบอัตโนมัติ — จดมิเตอร์ด้วย AI, ออกบิล+PromptPay,
                เชื่อม LINE ผู้เช่า, รายงานเรียลไทม์ เพิ่มกำไร ประหยัดเวลา
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/signup"
                  className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700"
                >
                  เริ่มใช้งานฟรี 30 วัน
                </Link>
                <a
                  href="#pricing"
                  className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  ดูแพ็คเกจ & ราคา
                </a>
              </div>
              <p className="mt-4 text-sm text-slate-400">
                ✓ ตั้งค่าง่ายใน 10 นาที   ✓ ผู้เช่าใช้ผ่าน LINE   ✓ ยกเลิกได้ทุกเมื่อ
              </p>
            </div>

            {/* hero visual: mock dashboard */}
            <div className="relative">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl shadow-indigo-100">
                <div className="mb-4 flex items-center justify-between">
                  <p className="font-semibold text-slate-900">แดชบอร์ด</p>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                    เรียลไทม์
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <MockStat label="อัตราเข้าพัก" value="92%" accent="text-indigo-600" />
                  <MockStat label="รายได้/เดือน" value="฿284,500" accent="text-emerald-600" />
                  <MockStat label="ห้องว่าง" value="8" accent="text-amber-600" />
                  <MockStat label="ค้างชำระ" value="฿12,400" accent="text-rose-600" />
                </div>
                <div className="mt-4 rounded-xl bg-slate-50 p-4">
                  <p className="mb-2 text-xs text-slate-500">รายได้ 6 เดือน</p>
                  <div className="flex items-end gap-2" style={{ height: 70 }}>
                    {[45, 60, 52, 72, 66, 88].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t bg-gradient-to-t from-indigo-500 to-cyan-400"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-4 -left-4 hidden rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg sm:block">
                <p className="text-xs text-slate-500">🤖 AI อ่านมิเตอร์</p>
                <p className="text-sm font-bold text-slate-900">248 → +42 หน่วย</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== STATS ===== */}
      <section className="border-y border-slate-100 bg-slate-50/50">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-6 py-10 sm:grid-cols-4">
          {[
            ["10,000+", "ห้องในระบบ"],
            ["ประหยัด 80%", "เวลาทำบิล"],
            ["24/7", "ผู้เช่าเช็คเองผ่าน LINE"],
            ["ไม่จำกัด", "อาคาร/ห้อง/ผู้เช่า"],
          ].map(([v, l]) => (
            <div key={l} className="text-center">
              <p className="text-2xl font-bold text-indigo-600 sm:text-3xl">{v}</p>
              <p className="mt-1 text-sm text-slate-500">{l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">ฟีเจอร์</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
            ทุกอย่างที่หอพักต้องใช้ ในระบบเดียว
          </h2>
          <p className="mt-3 text-slate-500">ครบตั้งแต่จดมิเตอร์ ออกบิล ไปจนถึงรายงานและแอปมือถือ</p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-50"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-2xl">
                {f.icon}
              </div>
              <h3 className="mt-4 font-bold text-slate-900">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section id="how" className="bg-gradient-to-b from-white to-indigo-50/40">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">วิธีใช้งาน</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">เริ่มใช้งานได้ใน 4 ขั้นตอน</h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.n} className="relative rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-cyan-500 font-bold text-white">
                  {s.n}
                </div>
                <h3 className="mt-4 font-bold text-slate-900">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PRICING ===== */}
      <Pricing />

      {/* ===== TESTIMONIALS ===== */}
      <section className="bg-slate-50/50">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">รีวิวจากผู้ใช้จริง</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">เจ้าของหอไว้ใจ ChaoDee</h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="text-amber-400">★★★★★</div>
                <p className="mt-3 text-slate-600">“{t.text}”</p>
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <p className="font-semibold text-slate-900">{t.name}</p>
                  <p className="text-sm text-slate-400">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="faq" className="mx-auto max-w-3xl px-6 py-20">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">คำถามที่พบบ่อย</h2>
        </div>
        <div className="mt-10 space-y-3">
          {FAQ.map((f) => (
            <details key={f.q} className="group rounded-xl border border-slate-200 bg-white p-5">
              <summary className="flex cursor-pointer items-center justify-between font-medium text-slate-900">
                {f.q}
                <span className="text-slate-400 transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm text-slate-500">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-cyan-500 px-8 py-14 text-center text-white">
          <h2 className="text-3xl font-bold sm:text-4xl">พร้อมเปลี่ยนหอของคุณให้เป็นระบบ?</h2>
          <p className="mx-auto mt-3 max-w-xl text-indigo-100">
            เริ่มใช้ฟรี 30 วันวันนี้ ตั้งค่าเสร็จใน 10 นาที ไม่ต้องผูกบัตร
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/signup" className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-50">
              เริ่มใช้งานฟรี
            </Link>
            <a href="https://line.me" target="_blank" rel="noreferrer" className="rounded-xl border border-white/40 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10">
              💬 ปรึกษาผ่าน LINE
            </a>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-slate-100 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white">ช</div>
            <span className="font-bold text-slate-900">ChaoDee</span>
            <span className="text-sm text-slate-400">— ระบบจัดการหอพัก คอนโด อพาร์ตเมนต์</span>
          </div>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-500">
            <a href="#features" className="hover:text-slate-900">ฟีเจอร์</a>
            <a href="#pricing" className="hover:text-slate-900">ราคา</a>
            <Link href="/privacy" className="hover:text-slate-900">ความเป็นส่วนตัว</Link>
            <Link href="/terms" className="hover:text-slate-900">ข้อกำหนด</Link>
            <Link href="/login" className="hover:text-slate-900">เข้าสู่ระบบ</Link>
          </div>
        </div>
        <p className="pb-8 text-center text-xs text-slate-400">
          © 2026 ChaoDee (เช่าดี) · chao-dee.com
        </p>
      </footer>
    </div>
  );
}

function MockStat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-1 text-lg font-bold ${accent}`}>{value}</p>
    </div>
  );
}
