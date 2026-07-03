import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { StatCard, Badge } from "@/components/ui";
import { BarChart, type BarDatum } from "@/components/bar-chart";
import {
  formatBaht,
  formatDate,
  formatPeriod,
  recentPeriods,
  SUBSCRIPTION_STATUS_LABEL,
  SUBSCRIPTION_STATUS_STYLE,
} from "@/lib/format";

export default async function OwnerDashboard() {
  const admin = createAdminClient();
  const [{ data: orgs }, { data: subs }, { data: pays }] = await Promise.all([
    admin.from("organizations").select("id, name, created_at"),
    admin.from("subscriptions").select("*, organizations(name)"),
    admin.from("subscription_payments").select("amount, status, paid_at, cycle"),
  ]);

  const subList = subs ?? [];
  const active = subList.filter((s) => s.status === "active").length;
  const trialing = subList.filter((s) => s.status === "trialing").length;
  const inactive = subList.filter((s) => ["expired", "cancelled", "past_due"].includes(s.status)).length;

  const mrr = subList
    .filter((s) => s.status === "active")
    .reduce((sum, s) => sum + Number(s.price) / (s.cycle === "yearly" ? 12 : 1), 0);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const revenueThisMonth = (pays ?? [])
    .filter((p) => p.status === "verified" && new Date(p.paid_at) >= monthStart)
    .reduce((s, p) => s + Number(p.amount), 0);
  const pendingPays = (pays ?? []).filter((p) => p.status === "pending");

  const newThisMonth = (orgs ?? []).filter((o) => new Date(o.created_at) >= monthStart).length;

  // ครบกำหนดใน 7 วัน
  const in7 = new Date(now.getTime() + 7 * 86400000);
  const expiringSoon = subList
    .filter((s) => s.expires_at && new Date(s.expires_at) <= in7 && s.status !== "cancelled")
    .sort((a, b) => (a.expires_at! < b.expires_at! ? -1 : 1));

  // รายได้ 6 เดือน (จากการชำระที่ verified)
  const periods = recentPeriods(6).reverse();
  const revByPeriod = new Map<string, number>();
  (pays ?? [])
    .filter((p) => p.status === "verified")
    .forEach((p) => {
      const k = String(p.paid_at).slice(0, 7);
      revByPeriod.set(k, (revByPeriod.get(k) ?? 0) + Number(p.amount));
    });
  const revChart: BarDatum[] = periods.map((p) => ({
    label: formatPeriod(p).split(" ")[0].slice(0, 3),
    value: revByPeriod.get(p) ?? 0,
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">ภาพรวมระบบ</h1>
      <p className="mt-1 text-sm text-slate-500">สรุปสมาชิกและรายได้ของ ChaoDee</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="สมาชิกทั้งหมด" value={String((orgs ?? []).length)} hint={`+${newThisMonth} เดือนนี้`} accent="indigo" />
        <StatCard label="รายได้/เดือน (MRR)" value={formatBaht(mrr)} hint={`ARR ${formatBaht(mrr * 12)}`} accent="emerald" />
        <StatCard label="รายได้เดือนนี้" value={formatBaht(revenueThisMonth)} accent="emerald" />
        <StatCard label="รอยืนยันชำระ" value={String(pendingPays.length)} hint={formatBaht(pendingPays.reduce((s, p) => s + Number(p.amount), 0))} accent="amber" />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <StatCard label="ใช้งานอยู่ (active)" value={String(active)} accent="emerald" />
        <StatCard label="ทดลองใช้ (trial)" value={String(trialing)} accent="slate" />
        <StatCard label="หมดอายุ/ระงับ" value={String(inactive)} accent="rose" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-3 font-semibold text-slate-900">รายได้ย้อนหลัง 6 เดือน</h2>
          <BarChart data={revChart} />
        </div>

        <div className="card p-5">
          <h2 className="mb-3 font-semibold text-slate-900">ครบกำหนดใน 7 วัน</h2>
          {expiringSoon.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">ไม่มีสมาชิกใกล้ครบกำหนด 🎉</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {expiringSoon.slice(0, 6).map((s) => (
                <Link
                  key={s.id}
                  href={`/owner/members/${s.org_id}`}
                  className="flex items-center justify-between py-2.5 text-sm hover:opacity-70"
                >
                  <span className="font-medium text-slate-900">
                    {(s.organizations as { name?: string } | null)?.name ?? "-"}
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge className={SUBSCRIPTION_STATUS_STYLE[s.status]}>
                      {SUBSCRIPTION_STATUS_LABEL[s.status]}
                    </Badge>
                    <span className="text-slate-500">{formatDate(s.expires_at)}</span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
