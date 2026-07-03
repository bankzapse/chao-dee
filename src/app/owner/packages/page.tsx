import { createAdminClient } from "@/lib/supabase/admin";
import { PACKAGES, COMMON_FEATURES } from "@/lib/packages";
import { formatBaht } from "@/lib/format";

export default async function OwnerPackages() {
  const admin = createAdminClient();
  const { data: subs } = await admin
    .from("subscriptions")
    .select("package_slug, status, price, cycle");

  const countBySlug = new Map<string, number>();
  const revBySlug = new Map<string, number>();
  (subs ?? []).forEach((s) => {
    countBySlug.set(s.package_slug, (countBySlug.get(s.package_slug) ?? 0) + 1);
    if (s.status === "active") {
      const monthly = Number(s.price) / (s.cycle === "yearly" ? 12 : 1);
      revBySlug.set(s.package_slug, (revBySlug.get(s.package_slug) ?? 0) + monthly);
    }
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">แพ็คเกจ</h1>
      <p className="mt-1 text-sm text-slate-500">แพ็คเกจที่เปิดขาย + จำนวนสมาชิกแต่ละแพ็คเกจ</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {PACKAGES.map((p) => (
          <div key={p.slug} className={`card p-6 ${p.highlight ? "ring-1 ring-indigo-200" : ""}`}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">{p.name}</h2>
              {p.highlight && <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700">แนะนำ</span>}
            </div>
            <p className="mt-1 text-sm text-slate-500">{p.tagline}</p>

            <div className="mt-4">
              {p.priceMonthly === null ? (
                <p className="text-2xl font-bold text-slate-900">ติดต่อเรา</p>
              ) : (
                <>
                  <p className="text-2xl font-bold text-slate-900">
                    ฿{p.priceYearlyPerMonth?.toLocaleString()}<span className="text-sm font-normal text-slate-500">/เดือน (รายปี)</span>
                  </p>
                  <p className="text-xs text-slate-400">รายเดือน ฿{p.priceMonthly.toLocaleString()} · ชำระรายปี ฿{p.priceYearlyTotal?.toLocaleString()}</p>
                </>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 border-y border-slate-100 py-4 text-center">
              <div>
                <p className="text-2xl font-bold text-indigo-600">{countBySlug.get(p.slug) ?? 0}</p>
                <p className="text-xs text-slate-400">สมาชิก</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">{formatBaht(revBySlug.get(p.slug) ?? 0)}</p>
                <p className="text-xs text-slate-400">MRR</p>
              </div>
            </div>

            <ul className="mt-4 space-y-1.5 text-sm text-slate-600">
              <li>อาคาร: <b>{p.limits.buildings}</b></li>
              <li>ห้อง: <b>{p.limits.rooms}</b></li>
              <li>ผู้เช่า: <b>{p.limits.tenants}</b></li>
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-6 card p-6">
        <h2 className="font-semibold text-slate-900">ฟีเจอร์ที่ทุกแพ็คเกจได้</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {COMMON_FEATURES.map((f) => (
            <li key={f} className="flex gap-2 text-sm text-slate-600">
              <span className="text-emerald-500">✓</span>
              {f}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
