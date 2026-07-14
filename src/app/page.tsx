import Link from "next/link";
import { Pricing } from "@/components/landing/pricing";
import { HeaderCta } from "@/components/landing/header-cta";
import { COMPANY } from "@/lib/company";
import { BrandMark } from "@/components/brand-mark";
import { DbdBadge } from "@/components/dbd-badge";
import { getEffectivePackages } from "@/lib/packages-db";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatBaht } from "@/lib/format";
import {
  PROPERTY_TYPE_LABEL,
  discountLabel,
  roomStatByBuilding,
  displayStat,
} from "@/lib/listings";
import type { PropertyListing } from "@/lib/types";

/** ดึงตัวอย่างประกาศห้องว่าง (โปรโมทก่อน) มาโชว์บนหน้าแรก — resilient ถ้ายังไม่ได้ migrate */
async function sampleListings() {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("property_listings")
      .select("*")
      .eq("is_published", true)
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(4);
    const listings = (data ?? []) as unknown as PropertyListing[];
    if (!listings.length) return [];
    const buildingIds = listings.map((l) => l.building_id).filter(Boolean) as string[];
    const { data: rooms } = buildingIds.length
      ? await admin.from("rooms").select("building_id, status, base_rent").in("building_id", buildingIds)
      : { data: [] };
    const byBuilding = roomStatByBuilding(
      (rooms ?? []) as { building_id: string; status: string; base_rent: number }[]
    );
    return listings.map((l) => ({ l, stat: displayStat(l, byBuilding) }));
  } catch {
    return [];
  }
}

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

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=900&q=80";

const GALLERY = [
  { src: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=600&q=75", label: "อพาร์ตเมนต์" },
  { src: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=600&q=75", label: "หอพัก" },
  { src: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=600&q=75", label: "คอนโด" },
];

export default async function LandingPage() {
  const [packages, samples] = await Promise.all([getEffectivePackages(), sampleListings()]);
  return (
    <div className="bg-white text-slate-800">
      {/* ===== NAV ===== */}
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <BrandMark size={36} />
            <span className="text-lg font-bold text-slate-900">Chao-Dee</span>
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

            {/* hero visual: รูปตึกจริง + การ์ดแดชบอร์ดลอยทับ */}
            <div className="relative pb-12 sm:pb-16">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={HERO_IMAGE}
                alt="อาคารอพาร์ตเมนต์"
                className="h-80 w-full rounded-3xl object-cover shadow-2xl shadow-indigo-200/70 sm:h-[440px]"
              />
              {/* การ์ดแดชบอร์ดลอย */}
              <div className="absolute -bottom-2 left-2 right-2 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur sm:left-6 sm:right-6 sm:p-5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-semibold text-slate-900">แดชบอร์ด</p>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                    เรียลไทม์
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <MockStat label="เข้าพัก" value="92%" accent="text-indigo-600" />
                  <MockStat label="รายได้" value="฿284k" accent="text-emerald-600" />
                  <MockStat label="ว่าง" value="8" accent="text-amber-600" />
                  <MockStat label="ค้าง" value="฿12k" accent="text-rose-600" />
                </div>
              </div>
              {/* การ์ด AI ลอย */}
              <div className="absolute right-2 top-4 rounded-xl border border-slate-100 bg-white px-3.5 py-2.5 shadow-lg sm:-right-5 sm:top-6">
                <p className="text-xs text-slate-500">🤖 AI อ่านมิเตอร์</p>
                <p className="text-sm font-bold text-slate-900">248 → +42 หน่วย</p>
              </div>
              {/* การ์ด LINE ลอย (เดสก์ท็อป) */}
              <div className="absolute -left-5 top-24 hidden rounded-xl border border-slate-100 bg-white px-3.5 py-2.5 shadow-lg lg:block">
                <p className="text-xs text-slate-500">💬 แจ้งผ่าน LINE</p>
                <p className="text-sm font-bold text-emerald-600">แจ้งซ่อมใหม่ 1</p>
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

      {/* ===== MARKETPLACE (หาห้อง / ลงประกาศ) ===== */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="flex flex-col justify-between rounded-3xl border border-indigo-100 bg-indigo-50/50 p-8">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-indigo-700">
                🔎 สำหรับผู้เช่า
              </span>
              <h3 className="mt-4 text-2xl font-bold text-slate-900">หาหอพัก คอนโด อพาร์ตเมนต์</h3>
              <p className="mt-2 text-slate-600">
                ห้องว่างพร้อมเข้าอยู่ อัปเดตเรียลไทม์จากระบบเจ้าของหอ —
                ติดต่อผ่าน Chao-Dee รับ<span className="font-semibold text-emerald-600">ส่วนลดเดือนแรก</span> 🎁
              </p>
            </div>
            <Link
              href="/rent"
              className="mt-6 inline-flex w-fit items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              ดูประกาศห้องว่าง →
            </Link>
          </div>

          <div className="flex flex-col justify-between rounded-3xl border border-emerald-100 bg-emerald-50/50 p-8">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-emerald-700">
                🏠 สำหรับเจ้าของหอ
              </span>
              <h3 className="mt-4 text-2xl font-bold text-slate-900">ลงประกาศหาผู้เช่า “ฟรี”</h3>
              <p className="mt-2 text-slate-600">
                สมาชิก Chao-Dee ลงประกาศโปรโมทที่พักได้ฟรี ระบบดึงห้องว่าง+ราคาให้อัตโนมัติ
                รับ lead ผู้สนใจตรงถึงคุณ — <span className="font-semibold">เฉพาะผู้ใช้ระบบ Chao-Dee</span>
              </p>
            </div>
            <Link
              href="/signup"
              className="mt-6 inline-flex w-fit items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              เริ่มใช้ฟรี แล้วลงประกาศ →
            </Link>
          </div>
        </div>
      </section>

      {/* ===== ตัวอย่างห้องว่าง (จากประกาศจริง) ===== */}
      {samples.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 pb-16">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">ห้องว่างล่าสุด</p>
              <h3 className="mt-1 text-2xl font-bold text-slate-900">ตัวอย่างที่พักบน Chao-Dee Rent</h3>
            </div>
            <Link href="/rent" className="hidden text-sm font-medium text-indigo-600 hover:text-indigo-700 sm:block">
              ดูทั้งหมด →
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {samples.map(({ l, stat }) => {
              const disc = discountLabel(l.first_month_discount_type, l.first_month_discount_value);
              return (
                <Link
                  key={l.id}
                  href={`/rent/${l.slug}`}
                  className="group flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="relative h-40 bg-slate-100">
                    {l.cover_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={l.cover_image}
                        alt={l.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-4xl text-slate-300">🏢</div>
                    )}
                    {stat.vacant > 0 && (
                      <span className="absolute right-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        ว่าง {stat.vacant} ห้อง
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <p className="text-[11px] uppercase tracking-wider text-slate-400">
                      {PROPERTY_TYPE_LABEL[l.property_type]}
                    </p>
                    <h4 className="mt-0.5 truncate font-semibold text-slate-900">{l.title}</h4>
                    <p className="mt-1 truncate text-sm text-slate-500">
                      📍 {[l.district, l.province].filter(Boolean).join(" · ") || "—"}
                    </p>
                    <div className="mt-3 flex items-baseline gap-1 border-t border-slate-100 pt-3">
                      <span className="text-lg font-bold text-slate-900">
                        {stat.minRent > 0 ? formatBaht(stat.minRent) : "สอบถาม"}
                      </span>
                      {stat.minRent > 0 && <span className="text-xs text-slate-400">/เดือน</span>}
                      {disc && (
                        <span className="ml-auto rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          ลด {disc}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ===== PROPERTY TYPES (gallery) ===== */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">รองรับทุกแบบ</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">ดูแลได้ทุกประเภทที่พัก</h2>
          <p className="mt-3 text-slate-500">หอพัก · คอนโด · อพาร์ตเมนต์ · เซอร์วิสอพาร์ตเมนต์ — จัดการได้ในระบบเดียว</p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {GALLERY.map((g) => (
            <div key={g.label} className="group relative overflow-hidden rounded-2xl shadow-sm ring-1 ring-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={g.src}
                alt={g.label}
                loading="lazy"
                className="h-60 w-full object-cover transition duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-slate-900/10 to-transparent" />
              <p className="absolute bottom-4 left-5 text-xl font-bold text-white drop-shadow">{g.label}</p>
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
      <Pricing packages={packages} />

      {/* ===== TESTIMONIALS ===== */}
      <section className="bg-slate-50/50">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">รีวิวจากผู้ใช้จริง</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">เจ้าของหอไว้ใจ Chao-Dee</h2>
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
            <BrandMark size={32} />
            <span className="font-bold text-slate-900">Chao-Dee</span>
            <span className="text-sm text-slate-400">— ระบบจัดการหอพัก คอนโด อพาร์ตเมนต์</span>
          </div>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-500">
            <a href="#features" className="hover:text-slate-900">ฟีเจอร์</a>
            <a href="#pricing" className="hover:text-slate-900">ราคา</a>
            <Link href="/privacy" className="hover:text-slate-900">ความเป็นส่วนตัว</Link>
            <Link href="/terms" className="hover:text-slate-900">ข้อกำหนด</Link>
            <Link href="/dpa" className="hover:text-slate-900">DPA</Link>
            <Link href="/login" className="hover:text-slate-900">เข้าสู่ระบบ</Link>
          </div>
        </div>
        <div className="pb-8 text-center text-xs text-slate-400">
          <div className="mb-4 flex justify-center">
            <DbdBadge />
          </div>
          <p>Chao-Dee เป็นผลิตภัณฑ์ในเครือกลุ๊ป · ดำเนินการโดย {COMPANY.name}</p>
          <p className="mt-1">เลขประจำตัวผู้เสียภาษี {COMPANY.taxId} · {COMPANY.address}</p>
          <p className="mt-1">
            ติดต่อ/ร้องเรียน: <a href={`mailto:${COMPANY.email}`} className="underline hover:text-slate-600">{COMPANY.email}</a>
            {COMPANY.phone ? ` · โทร ${COMPANY.phone}` : ""}
          </p>
          <p className="mt-1">© 2026 Chao-Dee · chao-dee.com</p>
        </div>
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
