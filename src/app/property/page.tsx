import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { BrandMark } from "@/components/brand-mark";
import { formatBaht } from "@/lib/format";
import { PROPERTY_TYPE_LABEL, discountLabel } from "@/lib/listings";
import { isFeaturedActive } from "@/lib/promotions";
import type { PropertyListing, PropertyType } from "@/lib/types";

export const runtime = "nodejs";

export const metadata = {
  title: "หาหอพัก คอนโด อพาร์ตเมนต์ ห้องว่างพร้อมเข้าอยู่ | Chao-Dee",
  description:
    "รวมหอพัก คอนโด อพาร์ตเมนต์ ห้องว่างพร้อมเข้าอยู่ อัปเดตเรียลไทม์ ติดต่อผ่าน Chao-Dee รับส่วนลดเดือนแรก",
  alternates: { canonical: "https://www.chao-dee.com/property" },
};

function Stat(rooms: { building_id: string; status: string; base_rent: number }[]) {
  const map = new Map<string, { vacant: number; minRent: number }>();
  rooms.forEach((r) => {
    const s = map.get(r.building_id) ?? { vacant: 0, minRent: 0 };
    if (r.status === "vacant") s.vacant += 1;
    const rent = Number(r.base_rent);
    if (rent > 0 && (s.minRent === 0 || rent < s.minRent)) s.minRent = rent;
    map.set(r.building_id, s);
  });
  return map;
}

export default async function PropertyMarketplace({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; province?: string; type?: string }>;
}) {
  const { q = "", province = "", type = "" } = await searchParams;
  const supabase = createAdminClient();

  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("property_listings")
    .select("*")
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  // โปรโมทที่ยัง active ขึ้นก่อน (หมดอายุแล้วถือว่าไม่โปรโมท)
  let listings = ((data ?? []) as unknown as PropertyListing[]).sort((a, b) => {
    const fa = isFeaturedActive(a, today) ? 1 : 0;
    const fb = isFeaturedActive(b, today) ? 1 : 0;
    return fb - fa;
  });

  const provinces = [...new Set(listings.map((l) => l.province).filter(Boolean))].sort();

  // กรอง
  const kw = q.trim().toLowerCase();
  listings = listings.filter((l) => {
    if (province && l.province !== province) return false;
    if (type && l.property_type !== type) return false;
    if (kw) {
      const hay = `${l.title} ${l.district} ${l.province} ${l.address}`.toLowerCase();
      if (!hay.includes(kw)) return false;
    }
    return true;
  });

  const buildingIds = listings.map((l) => l.building_id).filter(Boolean) as string[];
  const { data: rooms } = buildingIds.length
    ? await supabase.from("rooms").select("building_id, status, base_rent").in("building_id", buildingIds)
    : { data: [] };
  const stat = Stat((rooms ?? []) as { building_id: string; status: string; base_rent: number }[]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* header */}
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Link href="/" className="flex items-center gap-2">
            <BrandMark size={32} />
            <span className="font-bold text-slate-900">Chao-Dee</span>
          </Link>
          <Link href="/signup" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
            ลงประกาศหอของคุณ
          </Link>
        </div>
      </header>

      {/* hero + search */}
      <section className="border-b border-slate-100 bg-gradient-to-b from-indigo-50 to-slate-50">
        <div className="mx-auto max-w-6xl px-5 py-10">
          <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
            หาหอพัก คอนโด อพาร์ตเมนต์ ห้องว่างพร้อมเข้าอยู่
          </h1>
          <p className="mt-2 text-slate-600">
            ห้องว่างอัปเดตอัตโนมัติจากระบบเจ้าของหอ · ติดต่อผ่าน Chao-Dee รับส่วนลดเดือนแรก 🎁
          </p>

          <form className="mt-5 flex flex-wrap gap-2" action="/property">
            <input
              name="q"
              defaultValue={q}
              placeholder="ค้นหาทำเล เช่น รัชดา, ม.เกษตร"
              className="min-w-[200px] flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm"
            />
            <select name="province" defaultValue={province} className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm">
              <option value="">ทุกจังหวัด</option>
              {provinces.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <select name="type" defaultValue={type} className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm">
              <option value="">ทุกประเภท</option>
              {(Object.keys(PROPERTY_TYPE_LABEL) as PropertyType[]).map((t) => (
                <option key={t} value={t}>
                  {PROPERTY_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
            <button className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">
              ค้นหา
            </button>
          </form>
        </div>
      </section>

      {/* results */}
      <section className="mx-auto max-w-6xl px-5 py-8">
        <p className="mb-4 text-sm text-slate-500">พบ {listings.length} ที่พัก</p>

        {listings.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <p className="text-lg font-semibold text-slate-900">ยังไม่มีที่พักตรงเงื่อนไข</p>
            <p className="mt-1 text-sm text-slate-500">ลองปรับคำค้นหา หรือกลับมาใหม่เร็ว ๆ นี้</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((l) => {
              const s = stat.get(l.building_id ?? "") ?? { vacant: 0, minRent: 0 };
              const disc = discountLabel(l.first_month_discount_type, l.first_month_discount_value);
              const featured = isFeaturedActive(l, today);
              return (
                <Link
                  key={l.id}
                  href={`/property/${l.slug}`}
                  className={`group overflow-hidden rounded-2xl bg-white ring-1 transition hover:shadow-lg ${
                    featured ? "ring-2 ring-indigo-400" : "ring-slate-200"
                  }`}
                >
                  <div className="relative h-44 bg-slate-100">
                    {l.cover_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={l.cover_image}
                        alt={l.title}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-4xl text-slate-300">
                        🏢
                      </div>
                    )}
                    {featured && (
                      <span className="absolute left-3 top-3 rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white">
                        ⭐ โปรโมท
                      </span>
                    )}
                    {s.vacant > 0 && (
                      <span className="absolute right-3 top-3 rounded-lg bg-white/95 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        ว่าง {s.vacant} ห้อง
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-slate-400">{PROPERTY_TYPE_LABEL[l.property_type]}</p>
                    <h3 className="mt-0.5 truncate font-bold text-slate-900">{l.title}</h3>
                    <p className="mt-1 truncate text-sm text-slate-500">
                      📍 {[l.district, l.province].filter(Boolean).join(" · ") || "—"}
                    </p>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-xs text-slate-400">เริ่ม</span>
                      <span className="text-lg font-bold text-slate-900">
                        {s.minRent > 0 ? formatBaht(s.minRent) : "สอบถาม"}
                      </span>
                      {s.minRent > 0 && <span className="text-xs text-slate-400">/เดือน</span>}
                    </div>
                    {disc && (
                      <div className="mt-2 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-center text-xs font-medium text-emerald-700">
                        🎁 ส่วนลดเดือนแรก {disc}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <footer className="border-t border-slate-100 bg-white py-8 text-center text-xs text-slate-400">
        <p>ระบบจัดการหอพัก + ประกาศหาผู้เช่า · Chao-Dee · chao-dee.com</p>
      </footer>
    </div>
  );
}
