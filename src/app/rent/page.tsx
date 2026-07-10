import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { BrandMark } from "@/components/brand-mark";
import { formatBaht } from "@/lib/format";
import {
  PROPERTY_TYPE_LABEL,
  discountLabel,
  roomStatByBuilding,
  displayStat,
} from "@/lib/listings";
import { isFeaturedActive } from "@/lib/promotions";
import type { PropertyListing, PropertyType } from "@/lib/types";

export const runtime = "nodejs";
// อ่านสดจากฐานข้อมูลทุกครั้ง (กัน Next Data Cache ค้างรายการประกาศเก่า)
export const dynamic = "force-dynamic";

const PRICE_RANGES = [
  { v: "", label: "ทุกช่วงราคา", lo: 0, hi: Infinity },
  { v: "0-3000", label: "ต่ำกว่า ฿3,000", lo: 0, hi: 3000 },
  { v: "3000-5000", label: "฿3,000 – 5,000", lo: 3000, hi: 5000 },
  { v: "5000-8000", label: "฿5,000 – 8,000", lo: 5000, hi: 8000 },
  { v: "8000-12000", label: "฿8,000 – 12,000", lo: 8000, hi: 12000 },
  { v: "12000-", label: "฿12,000 ขึ้นไป", lo: 12000, hi: Infinity },
];

export const metadata = {
  title: "Chao-Dee Rent — หาหอพัก คอนโด อพาร์ตเมนต์ ห้องว่างพร้อมเข้าอยู่",
  description:
    "เว็บหาห้องเช่า หอพัก คอนโด อพาร์ตเมนต์ ห้องว่างอัปเดตเรียลไทม์ ค้นหาตามทำเล/ราคา ติดต่อเจ้าของตรง รับส่วนลดเดือนแรกผ่าน Chao-Dee",
  alternates: { canonical: "https://www.chao-dee.com/rent" },
  openGraph: {
    title: "Chao-Dee Rent — หาห้องเช่าง่าย ห้องว่างพร้อมเข้าอยู่",
    description: "หอพัก คอนโด อพาร์ตเมนต์ ทั่วไทย ค้นหาตามทำเล/ราคา ติดต่อเจ้าของตรง",
    url: "https://www.chao-dee.com/rent",
  },
};

function LuxeCard({
  l,
  vacant,
  minRent,
  featured,
}: {
  l: PropertyListing;
  vacant: number;
  minRent: number;
  featured: boolean;
}) {
  const disc = discountLabel(l.first_month_discount_type, l.first_month_discount_value);
  return (
    <Link
      href={`/rent/${l.slug}`}
      className={`group flex flex-col overflow-hidden rounded-2xl bg-white ring-1 transition hover:-translate-y-0.5 hover:shadow-xl ${
        featured ? "ring-2 ring-amber-300" : "ring-slate-200"
      }`}
    >
      <div className="relative h-48 bg-slate-100">
        {l.cover_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={l.cover_image}
            alt={l.title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl text-slate-300">🏢</div>
        )}
        {featured && (
          <span className="absolute left-3 top-3 rounded-full bg-amber-400 px-3 py-1 text-xs font-semibold text-amber-950 shadow">
            ⭐ แนะนำ
          </span>
        )}
        {vacant > 0 && (
          <span className="absolute right-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-emerald-700 shadow-sm">
            ว่าง {vacant} ห้อง
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-[11px] uppercase tracking-wider text-slate-400">
          {PROPERTY_TYPE_LABEL[l.property_type]}
        </p>
        <h3 className="mt-0.5 truncate font-semibold text-slate-900">{l.title}</h3>
        <p className="mt-1 truncate text-sm text-slate-500">
          📍 {[l.district, l.province].filter(Boolean).join(" · ") || "—"}
        </p>
        <div className="mt-3 flex items-baseline gap-1 border-t border-slate-100 pt-3">
          <span className="text-xs text-slate-400">เริ่ม</span>
          <span className="text-lg font-bold text-slate-900">
            {minRent > 0 ? formatBaht(minRent) : "สอบถาม"}
          </span>
          {minRent > 0 && <span className="text-xs text-slate-400">/เดือน</span>}
          {disc && (
            <span className="ml-auto rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
              ลด {disc}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default async function RentHome({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; province?: string; type?: string; price?: string }>;
}) {
  const { q = "", province = "", type = "", price = "" } = await searchParams;
  const supabase = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data } = await supabase
    .from("property_listings")
    .select("*")
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  const all = (data ?? []) as unknown as PropertyListing[];
  const provinces = [...new Set(all.map((l) => l.province).filter(Boolean))].sort();

  // คำนวณห้องว่าง/ราคาของทุกประกาศก่อน แล้วค่อยกรอง (เพื่อกรองตามช่วงราคาได้)
  const buildingIds = all.map((l) => l.building_id).filter(Boolean) as string[];
  const { data: rooms } = buildingIds.length
    ? await supabase.from("rooms").select("building_id, status, base_rent").in("building_id", buildingIds)
    : { data: [] };
  const byBuilding = roomStatByBuilding(
    (rooms ?? []) as { building_id: string; status: string; base_rent: number }[]
  );

  const range = PRICE_RANGES.find((r) => r.v === price) ?? PRICE_RANGES[0];
  const kw = q.trim().toLowerCase();

  const withStat = all
    .map((l) => ({ l, stat: displayStat(l, byBuilding), featured: isFeaturedActive(l, today) }))
    .filter(({ l, stat }) => {
      if (province && l.province !== province) return false;
      if (type && l.property_type !== type) return false;
      if (kw) {
        const hay = `${l.title} ${l.district} ${l.province} ${l.address}`.toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      if (range.v) {
        // ต้องมีราคา และราคาเริ่มต้นอยู่ในช่วง
        if (!(stat.minRent > 0 && stat.minRent >= range.lo && stat.minRent <= range.hi)) return false;
      }
      return true;
    });
  withStat.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
  const featured = withStat.filter((x) => x.featured);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ===== NAV ===== */}
      <header className="sticky top-0 z-40 border-b border-slate-800/10 bg-slate-900 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Link href="/rent" className="flex items-center gap-2">
            <BrandMark size={30} />
            <span className="font-bold">Chao-Dee <span className="font-light text-amber-300">Rent</span></span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/rent/login" className="text-slate-300 hover:text-white">
              เข้าสู่ระบบ
            </Link>
            <Link
              href="/rent/signup"
              className="rounded-lg bg-amber-400 px-4 py-2 font-semibold text-amber-950 hover:bg-amber-300"
            >
              ลงประกาศฟรี
            </Link>
          </div>
        </div>
      </header>

      {/* ===== HERO + SEARCH ===== */}
      <section className="relative overflow-hidden bg-slate-900 text-white">
        <div className="absolute inset-0 -z-0 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/70" />
        <div className="relative mx-auto max-w-4xl px-5 py-16 text-center sm:py-20">
          <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">
            หาห้องเช่าที่ใช่ <span className="text-amber-300">ง่ายในที่เดียว</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-slate-300">
            หอพัก · คอนโด · อพาร์ตเมนต์ ห้องว่างพร้อมเข้าอยู่ อัปเดตเรียลไทม์ ·
            ติดต่อเจ้าของตรง รับส่วนลดเดือนแรกผ่าน Chao-Dee
          </p>

          <form
            action="/rent"
            className="mx-auto mt-8 flex max-w-3xl flex-wrap gap-2 rounded-2xl bg-white p-2 shadow-2xl"
          >
            <input
              name="q"
              defaultValue={q}
              placeholder="ค้นหาทำเล เช่น รัชดา, ม.เกษตร, อโศก"
              className="min-w-[180px] flex-1 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none"
            />
            <select name="province" defaultValue={province} className="rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-700">
              <option value="">ทุกจังหวัด</option>
              {provinces.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <select name="type" defaultValue={type} className="rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-700">
              <option value="">ทุกประเภท</option>
              {(Object.keys(PROPERTY_TYPE_LABEL) as PropertyType[]).map((t) => (
                <option key={t} value={t}>{PROPERTY_TYPE_LABEL[t]}</option>
              ))}
            </select>
            <select name="price" defaultValue={price} className="rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-700">
              {PRICE_RANGES.map((r) => (
                <option key={r.v} value={r.v}>{r.label}</option>
              ))}
            </select>
            <button className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800">
              ค้นหา
            </button>
          </form>

          {/* quick type chips */}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {(Object.keys(PROPERTY_TYPE_LABEL) as PropertyType[]).map((t) => (
              <Link
                key={t}
                href={`/rent?type=${t}`}
                className="rounded-full border border-white/20 px-4 py-1.5 text-sm text-slate-200 hover:border-amber-300 hover:text-amber-300"
              >
                {PROPERTY_TYPE_LABEL[t]}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURED ===== */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 pt-10">
          <div className="mb-4 flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">⭐ ประกาศแนะนำ</h2>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">โปรโมท</span>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.slice(0, 4).map(({ l, stat }) => (
              <LuxeCard key={l.id} l={l} vacant={stat.vacant} minRent={stat.minRent} featured />
            ))}
          </div>
        </section>
      )}

      {/* ===== ALL ===== */}
      <section className="mx-auto max-w-6xl px-5 py-10">
        <p className="mb-4 text-sm text-slate-500">
          {q || province || type ? `ผลการค้นหา · ` : "ที่พักทั้งหมด · "}
          {withStat.length} รายการ
        </p>
        {withStat.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <p className="text-lg font-semibold text-slate-900">ยังไม่มีที่พักตรงเงื่อนไข</p>
            <p className="mt-1 text-sm text-slate-500">ลองปรับคำค้นหา หรือกลับมาใหม่เร็ว ๆ นี้</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {withStat.map(({ l, stat, featured: f }) => (
              <LuxeCard key={l.id} l={l} vacant={stat.vacant} minRent={stat.minRent} featured={f} />
            ))}
          </div>
        )}
      </section>

      {/* ===== OWNER CTA ===== */}
      <section className="border-t border-slate-100 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-10 text-center sm:flex-row sm:text-left">
          <div>
            <h2 className="text-xl font-bold text-slate-900">มีห้องให้เช่า? ลงประกาศฟรี</h2>
            <p className="mt-1 text-sm text-slate-500">
              ลูกค้า Chao-Dee ลงได้ทันที · เจ้าของทั่วไปสมัครฟรี ห้องว่างอัปเดตอัตโนมัติ
            </p>
          </div>
          <Link
            href="/rent/signup"
            className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800"
          >
            เริ่มลงประกาศ →
          </Link>
        </div>
      </section>

      <footer className="bg-slate-900 py-8 text-center text-xs text-slate-400">
        <p>Chao-Dee Rent · ระบบหาห้องเช่า + จัดการหอพักครบวงจร · chao-dee.com</p>
      </footer>
    </div>
  );
}
