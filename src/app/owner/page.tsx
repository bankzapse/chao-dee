import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui";
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
  const [{ data: orgs }, { data: subs }, { data: pays }, { data: promos }] = await Promise.all([
    admin.from("organizations").select("id, name, created_at, account_type"),
    admin.from("subscriptions").select("*, organizations(name)"),
    admin.from("subscription_payments").select("amount, status, paid_at, cycle"),
    admin.from("listing_promotions").select("amount, status, created_at"),
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

  const totalMembers = (orgs ?? []).length;
  const pendingAmount = pendingPays.reduce((s, p) => s + Number(p.amount), 0);
  const statusTotal = Math.max(1, active + trialing + inactive);

  // ===== แยกตามธุรกิจ =====
  const chaodeeOrgs = (orgs ?? []).filter((o) => (o.account_type ?? "chaodee") !== "rent").length;
  const rentOrgs = (orgs ?? []).filter((o) => o.account_type === "rent").length;

  const promoList = promos ?? [];
  const rentRevenueTotal = promoList
    .filter((p) => p.status === "active")
    .reduce((s, p) => s + Number(p.amount), 0);
  const rentRevenueThisMonth = promoList
    .filter((p) => p.status === "active" && new Date(p.created_at) >= monthStart)
    .reduce((s, p) => s + Number(p.amount), 0);
  const rentPending = promoList.filter((p) => p.status === "pending").length;

  const kpis = [
    { icon: "👥", label: "สมาชิกทั้งหมด", value: String(totalMembers), hint: `+${newThisMonth} เดือนนี้`, grad: "from-indigo-500 to-violet-500" },
    { icon: "💰", label: "รายได้/เดือน (MRR)", value: formatBaht(mrr), hint: `ARR ${formatBaht(mrr * 12)}`, grad: "from-emerald-500 to-teal-500" },
    { icon: "📈", label: "รายได้เดือนนี้", value: formatBaht(revenueThisMonth), hint: "จากที่ยืนยันแล้ว", grad: "from-cyan-500 to-sky-500" },
    { icon: "⏳", label: "รอยืนยันชำระ", value: String(pendingPays.length), hint: formatBaht(pendingAmount), grad: "from-amber-500 to-orange-500" },
  ];

  return (
    <div className="animate-in space-y-6">
      {/* hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-cyan-500 p-6 text-white shadow-lg shadow-indigo-500/20 md:p-8">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-sm text-indigo-100">แผงเจ้าของระบบ · Chao-Dee</p>
          <h1 className="mt-1 text-2xl font-bold md:text-3xl">ภาพรวมระบบ</h1>
          <p className="mt-1 text-sm text-indigo-100">
            {totalMembers} กิจการ · {active} ใช้งานอยู่ · {formatBaht(mrr)}/เดือน
          </p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="card card-hover p-5">
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${k.grad} text-xl shadow-sm`}>
              {k.icon}
            </div>
            <p className="mt-3 text-sm text-slate-500">{k.label}</p>
            <p className="mt-0.5 text-2xl font-bold text-slate-900">{k.value}</p>
            <p className="mt-0.5 text-xs text-slate-400">{k.hint}</p>
          </div>
        ))}
      </div>

      {/* แยกตามธุรกิจ: Chao-Dee (จัดการหอ) vs Rent (marketplace) */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold text-slate-900">🏢 ธุรกิจ Chao-Dee</h2>
            <span className="text-xs text-slate-400">{chaodeeOrgs} กิจการ</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-400">รายได้ค่าสมาชิก/เดือน (MRR)</p>
              <p className="mt-0.5 text-xl font-bold text-emerald-600">{formatBaht(mrr)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-400">รับชำระเดือนนี้</p>
              <p className="mt-0.5 text-xl font-bold text-slate-900">{formatBaht(revenueThisMonth)}</p>
            </div>
          </div>
          <Link href="/owner/payments" className="mt-3 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-700">
            ดูการชำระค่าสมาชิก →
          </Link>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold text-slate-900">⭐ ธุรกิจ Rent</h2>
            <span className="text-xs text-slate-400">{rentOrgs} บัญชี rent</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-400">รายได้โปรโมทเดือนนี้</p>
              <p className="mt-0.5 text-xl font-bold text-amber-600">{formatBaht(rentRevenueThisMonth)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-400">โปรโมทที่ยัง active</p>
              <p className="mt-0.5 text-xl font-bold text-slate-900">{formatBaht(rentRevenueTotal)}</p>
            </div>
          </div>
          <Link href="/owner/listings" className="mt-3 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-700">
            {rentPending > 0 ? `อนุมัติโปรโมท (${rentPending} รอ) →` : "จัดการโปรโมท →"}
          </Link>
        </div>
      </div>

      {/* สถานะสมาชิก + แถบสัดส่วน */}
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">สถานะสมาชิก</h2>
          <span className="text-xs text-slate-400">รวม {active + trialing + inactive} กิจการ</span>
        </div>
        <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div className="bg-emerald-500" style={{ width: `${(active / statusTotal) * 100}%` }} />
          <div className="bg-slate-300" style={{ width: `${(trialing / statusTotal) * 100}%` }} />
          <div className="bg-rose-400" style={{ width: `${(inactive / statusTotal) * 100}%` }} />
        </div>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> ใช้งานอยู่ <b className="text-slate-900">{active}</b></span>
          <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-slate-300" /> ทดลองใช้ <b className="text-slate-900">{trialing}</b></span>
          <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-rose-400" /> หมดอายุ/ระงับ <b className="text-slate-900">{inactive}</b></span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-3 font-semibold text-slate-900">รายได้ย้อนหลัง 6 เดือน</h2>
          <BarChart data={revChart} />
        </div>

        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">ครบกำหนดใน 7 วัน</h2>
            {expiringSoon.length > 0 && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                {expiringSoon.length} รายการ
              </span>
            )}
          </div>
          {expiringSoon.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">ไม่มีสมาชิกใกล้ครบกำหนด 🎉</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {expiringSoon.slice(0, 6).map((s) => (
                <Link
                  key={s.id}
                  href={`/owner/members/${s.org_id}`}
                  className="flex items-center justify-between py-2.5 text-sm transition hover:opacity-70"
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
