import { requirePerm } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { StatCard } from "@/components/ui";
import { BarChart, type BarDatum } from "@/components/bar-chart";
import { PACKAGES } from "@/lib/packages";
import { formatBaht, formatPeriod, recentPeriods } from "@/lib/format";

export default async function OwnerReports() {
  await requirePerm("reports");
  const admin = createAdminClient();
  const [{ data: subs }, { data: pays }] = await Promise.all([
    admin.from("subscriptions").select("package_slug, status, price, cycle"),
    admin.from("subscription_payments").select("amount, status, paid_at"),
  ]);

  // รายได้รายเดือน 12 เดือน (verified)
  const periods = recentPeriods(12).reverse();
  const revMap = new Map<string, number>();
  (pays ?? [])
    .filter((p) => p.status === "verified")
    .forEach((p) => {
      const k = String(p.paid_at).slice(0, 7);
      revMap.set(k, (revMap.get(k) ?? 0) + Number(p.amount));
    });
  const revChart: BarDatum[] = periods.map((p) => ({
    label: formatPeriod(p).split(" ")[0].slice(0, 3),
    value: revMap.get(p) ?? 0,
  }));

  // การกระจายแพ็คเกจ (เฉพาะ active)
  const activeSubs = (subs ?? []).filter((s) => s.status === "active");
  const pkgChart: BarDatum[] = PACKAGES.map((p) => ({
    label: p.name,
    value: activeSubs.filter((s) => s.package_slug === p.slug).length,
  }));

  const totalVerified = (pays ?? [])
    .filter((p) => p.status === "verified")
    .reduce((s, p) => s + Number(p.amount), 0);
  const mrr = activeSubs.reduce((s, x) => s + Number(x.price) / (x.cycle === "yearly" ? 12 : 1), 0);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">รายงาน</h1>
          <p className="mt-1 text-sm text-slate-500">รายได้และการกระจายแพ็คเกจ</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <a href="/owner/reports/export?type=subscriptions" className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50">
            ⬇︎ สมาชิก (CSV)
          </a>
          <a href="/owner/reports/export?type=payments" className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50">
            ⬇︎ การชำระเงิน (CSV)
          </a>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="รายรับสะสม (ยืนยันแล้ว)" value={formatBaht(totalVerified)} accent="emerald" />
        <StatCard label="MRR" value={formatBaht(mrr)} accent="indigo" />
        <StatCard label="ARR (คาดการณ์)" value={formatBaht(mrr * 12)} accent="indigo" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-3 font-semibold text-slate-900">รายได้รายเดือน (12 เดือน)</h2>
          <BarChart data={revChart} />
        </div>
        <div className="card p-5">
          <h2 className="mb-3 font-semibold text-slate-900">สมาชิก active แยกตามแพ็คเกจ</h2>
          <BarChart data={pkgChart} color="#10b981" />
        </div>
      </div>
    </div>
  );
}
