import { createClient } from "@/lib/supabase/server";
import { PageHeader, StatCard } from "@/components/ui";
import { BarChart, type BarDatum } from "@/components/bar-chart";
import { formatBaht, formatPeriod, recentPeriods } from "@/lib/format";

export default async function ReportsPage() {
  const supabase = await createClient();
  const periods = recentPeriods(6).reverse(); // เก่า → ใหม่

  const [{ data: invoices }, { data: expenses }, { data: rooms }] =
    await Promise.all([
      supabase.from("invoices").select("period, total_amount, paid_amount, status"),
      supabase.from("building_expenses").select("expense_date, amount"),
      supabase.from("rooms").select("status"),
    ]);

  const inv = invoices ?? [];
  const revByPeriod = new Map<string, { billed: number; paid: number }>();
  inv.forEach((i) => {
    if (i.status === "void") return;
    const e = revByPeriod.get(i.period) ?? { billed: 0, paid: 0 };
    e.billed += Number(i.total_amount);
    e.paid += Number(i.paid_amount);
    revByPeriod.set(i.period, e);
  });

  const expByPeriod = new Map<string, number>();
  (expenses ?? []).forEach((x) => {
    const p = String(x.expense_date).slice(0, 7);
    expByPeriod.set(p, (expByPeriod.get(p) ?? 0) + Number(x.amount));
  });

  const shortLabel = (p: string) => formatPeriod(p).split(" ")[0].slice(0, 3);

  const revenueChart: BarDatum[] = periods.map((p) => ({
    label: shortLabel(p),
    value: revByPeriod.get(p)?.billed ?? 0,
    value2: revByPeriod.get(p)?.paid ?? 0,
  }));
  const profitChart: BarDatum[] = periods.map((p) => ({
    label: shortLabel(p),
    value: revByPeriod.get(p)?.paid ?? 0,
    value2: expByPeriod.get(p) ?? 0,
  }));

  // สรุปรวม
  const totalBilled = inv
    .filter((i) => i.status !== "void")
    .reduce((s, i) => s + Number(i.total_amount), 0);
  const totalPaid = inv.reduce((s, i) => s + Number(i.paid_amount), 0);
  const outstanding = totalBilled - totalPaid;

  const totalRooms = rooms?.length ?? 0;
  const occupied = (rooms ?? []).filter((r) => r.status === "occupied").length;
  const occupancy = totalRooms > 0 ? Math.round((occupied / totalRooms) * 100) : 0;

  return (
    <div>
      <PageHeader title="รายงาน & วิเคราะห์" subtitle="ภาพรวมการเงินและการเข้าพัก" />

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <StatCard label="ออกบิลสะสม" value={formatBaht(totalBilled)} accent="slate" />
        <StatCard label="เก็บได้สะสม" value={formatBaht(totalPaid)} accent="emerald" />
        <StatCard label="ค้างชำระ" value={formatBaht(outstanding)} accent="rose" />
        <StatCard
          label="อัตราเข้าพัก"
          value={`${occupancy}%`}
          hint={`${occupied}/${totalRooms} ห้อง`}
          accent="indigo"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-3 font-semibold text-slate-900">
            รายได้รายเดือน (ออกบิล vs เก็บได้)
          </h2>
          <BarChart data={revenueChart} legend={["ออกบิล", "เก็บได้"]} />
        </div>
        <div className="card p-5">
          <h2 className="mb-3 font-semibold text-slate-900">
            เก็บได้ vs ค่าใช้จ่ายรายเดือน
          </h2>
          <BarChart
            data={profitChart}
            color="#10b981"
            color2="#f59e0b"
            legend={["เก็บได้", "ค่าใช้จ่าย"]}
          />
        </div>
      </div>
    </div>
  );
}
