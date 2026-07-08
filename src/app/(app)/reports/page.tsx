import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, StatCard, EmptyState, Badge } from "@/components/ui";
import { BarChart, type BarDatum } from "@/components/bar-chart";
import {
  formatBaht,
  formatNumber,
  formatDate,
  formatPeriod,
  recentPeriods,
} from "@/lib/format";
import { SeedDemoButton } from "../dashboard/demo-button";

type ExpiringContract = {
  id: string;
  end_date: string | null;
  rooms: { room_number: string; buildings: { name: string } | null } | null;
  tenants: { full_name: string } | null;
};

export default async function ReportsPage() {
  const supabase = await createClient();

  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 86400000).toISOString().slice(0, 10);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const periods = recentPeriods(6).reverse(); // เก่า → ใหม่

  const [
    { data: invoices },
    { data: expenses },
    { data: rooms },
    { count: buildingCount },
    { count: tenantCount },
    { data: activeContracts },
  ] = await Promise.all([
    supabase.from("invoices").select("period, total_amount, paid_amount, status"),
    supabase.from("building_expenses").select("expense_date, amount"),
    supabase.from("rooms").select("status"),
    supabase.from("buildings").select("*", { count: "exact", head: true }),
    supabase.from("tenants").select("*", { count: "exact", head: true }),
    supabase
      .from("contracts")
      .select("id, rent_amount, end_date, rooms(room_number, buildings(name)), tenants(full_name)")
      .eq("status", "active"),
  ]);

  const inv = invoices ?? [];

  // รายรับที่ "เก็บได้จริง" (paid) ต่อเดือน + ยอดออกบิล
  const revByPeriod = new Map<string, { billed: number; paid: number }>();
  inv.forEach((i) => {
    if (i.status === "void") return;
    const e = revByPeriod.get(i.period) ?? { billed: 0, paid: 0 };
    e.billed += Number(i.total_amount);
    e.paid += Number(i.paid_amount);
    revByPeriod.set(i.period, e);
  });

  // รายจ่ายต่อเดือน (จาก building_expenses)
  const expByPeriod = new Map<string, number>();
  (expenses ?? []).forEach((x) => {
    const p = String(x.expense_date).slice(0, 7);
    expByPeriod.set(p, (expByPeriod.get(p) ?? 0) + Number(x.amount));
  });

  // ตารางรายเดือน: รายรับ (เก็บได้) − รายจ่าย = คงเหลือ
  const monthly = periods.map((p) => {
    const income = revByPeriod.get(p)?.paid ?? 0;
    const expense = expByPeriod.get(p) ?? 0;
    return { period: p, income, expense, net: income - expense };
  });

  const shortLabel = (p: string) => formatPeriod(p).split(" ")[0].slice(0, 3);
  const incomeVsExpense: BarDatum[] = monthly.map((m) => ({
    label: shortLabel(m.period),
    value: m.income,
    value2: m.expense,
  }));

  // สรุปสะสม
  const totalBilled = inv
    .filter((i) => i.status !== "void")
    .reduce((s, i) => s + Number(i.total_amount), 0);
  const totalPaid = inv.reduce((s, i) => s + Number(i.paid_amount), 0);
  const outstanding = totalBilled - totalPaid;

  // สถานะห้อง / รายได้ตามสัญญา / ค่าใช้จ่ายเดือนนี้
  const totalRooms = rooms?.length ?? 0;
  const occupied = (rooms ?? []).filter((r) => r.status === "occupied").length;
  const vacant = (rooms ?? []).filter((r) => r.status === "vacant").length;
  const occupancy = totalRooms > 0 ? Math.round((occupied / totalRooms) * 100) : 0;

  const contracts = (activeContracts ?? []) as unknown as (ExpiringContract & {
    rent_amount: number;
  })[];
  const contractRevenue = contracts.reduce((s, c) => s + Number(c.rent_amount), 0);
  const monthExpense = (expenses ?? [])
    .filter((x) => String(x.expense_date) >= monthStart)
    .reduce((s, x) => s + Number(x.amount), 0);

  const expiringList = contracts
    .filter((c) => c.end_date && c.end_date <= in30)
    .sort((a, b) => (a.end_date ?? "").localeCompare(b.end_date ?? ""));

  const isEmpty = (buildingCount ?? 0) === 0 && totalRooms === 0;

  if (isEmpty) {
    return (
      <div>
        <PageHeader title="แดชบอร์ด / รายงาน" subtitle="ภาพรวมหอพักของคุณ" action={<SeedDemoButton />} />
        <EmptyState
          title="ยินดีต้อนรับสู่ Chao-Dee 🎉"
          description="เริ่มต้นด้วยการเพิ่มอาคารและห้องพัก หรือลองโหลดข้อมูลตัวอย่างเพื่อดูการทำงานของระบบ"
          action={
            <div className="flex gap-2">
              <SeedDemoButton />
              <Link href="/buildings" className="btn-primary">
                เพิ่มอาคารแรก
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="แดชบอร์ด / รายงาน" subtitle="ภาพรวมหอพัก · การเงิน · การเข้าพัก" />

      {/* ===== ภาพรวมวันนี้ ===== */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="อัตราการเข้าพัก"
          value={`${occupancy}%`}
          hint={`เข้าพัก ${occupied} · ว่าง ${vacant} · รวม ${totalRooms} ห้อง`}
          accent="indigo"
        />
        <StatCard
          label="รายได้ค่าเช่า/เดือน"
          value={formatBaht(contractRevenue)}
          hint="ตามสัญญาที่ใช้งานอยู่"
          accent="emerald"
        />
        <StatCard
          label="ค่าใช้จ่ายเดือนนี้"
          value={formatBaht(monthExpense)}
          hint="ค่าใช้จ่ายอาคารที่บันทึกไว้"
          accent="amber"
        />
        <StatCard
          label="ค้างชำระ (สะสม)"
          value={formatBaht(outstanding)}
          hint={`ออกบิล ${formatBaht(totalBilled)} · เก็บได้ ${formatBaht(totalPaid)}`}
          accent="rose"
        />
      </div>

      {/* ===== รายรับ vs รายจ่าย รายเดือน (ตัวหลัก — ทำให้เข้าใจง่าย) ===== */}
      <div className="mt-6 card p-5">
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">รายรับ vs รายจ่าย รายเดือน</h2>
          <span className="text-xs text-slate-400">ย้อนหลัง 6 เดือน</span>
        </div>
        <p className="mb-4 text-sm text-slate-500">
          <span className="font-medium text-emerald-600">รายรับ</span> = เงินที่เก็บได้จริงในเดือนนั้น ·{" "}
          <span className="font-medium text-amber-600">รายจ่าย</span> = ค่าใช้จ่ายอาคาร ·{" "}
          <span className="font-medium text-slate-700">คงเหลือ</span> = รายรับ − รายจ่าย
        </p>

        <BarChart
          data={incomeVsExpense}
          height={220}
          color="#10b981"
          color2="#f59e0b"
          legend={["รายรับ (เก็บได้)", "รายจ่าย"]}
        />

        {/* ตารางสรุป — อ่านตัวเลขชัดเจนที่สุด */}
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-400">
              <tr>
                <th className="py-2 font-medium">เดือน</th>
                <th className="py-2 text-right font-medium">รายรับ (เก็บได้)</th>
                <th className="py-2 text-right font-medium">รายจ่าย</th>
                <th className="py-2 text-right font-medium">คงเหลือ (กำไร/ขาดทุน)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {monthly.map((m) => (
                <tr key={m.period}>
                  <td className="py-2 font-medium text-slate-700">{formatPeriod(m.period)}</td>
                  <td className="py-2 text-right text-emerald-600">{formatBaht(m.income)}</td>
                  <td className="py-2 text-right text-amber-600">{formatBaht(m.expense)}</td>
                  <td
                    className={`py-2 text-right font-semibold ${
                      m.net >= 0 ? "text-emerald-700" : "text-rose-600"
                    }`}
                  >
                    {m.net >= 0 ? "+" : "−"}
                    {formatBaht(Math.abs(m.net))}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 font-semibold">
                <td className="py-2 text-slate-900">รวม 6 เดือน</td>
                <td className="py-2 text-right text-emerald-700">
                  {formatBaht(monthly.reduce((s, m) => s + m.income, 0))}
                </td>
                <td className="py-2 text-right text-amber-700">
                  {formatBaht(monthly.reduce((s, m) => s + m.expense, 0))}
                </td>
                <td
                  className={`py-2 text-right ${
                    monthly.reduce((s, m) => s + m.net, 0) >= 0
                      ? "text-emerald-700"
                      : "text-rose-600"
                  }`}
                >
                  {(() => {
                    const net = monthly.reduce((s, m) => s + m.net, 0);
                    return `${net >= 0 ? "+" : "−"}${formatBaht(Math.abs(net))}`;
                  })()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ===== นับรวม + สัญญาใกล้หมดอายุ ===== */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="grid grid-cols-3 gap-4 lg:col-span-1 lg:grid-cols-1">
          <StatCard label="อาคาร" value={formatNumber(buildingCount ?? 0)} accent="slate" />
          <StatCard label="ห้องพักทั้งหมด" value={formatNumber(totalRooms)} accent="slate" />
          <StatCard label="ผู้เช่า" value={formatNumber(tenantCount ?? 0)} accent="slate" />
        </div>

        <div className="lg:col-span-2">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">
            สัญญาใกล้หมดอายุ (ภายใน 30 วัน)
          </h2>
          {expiringList.length === 0 ? (
            <div className="card p-6 text-sm text-slate-500">ไม่มีสัญญาที่ใกล้หมดอายุ 🎉</div>
          ) : (
            <div className="card divide-y divide-slate-100">
              {expiringList.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <div>
                    <span className="font-medium text-slate-900">
                      {c.rooms?.buildings?.name ?? "-"} · ห้อง {c.rooms?.room_number ?? "-"}
                    </span>
                    <span className="ml-2 text-slate-500">{c.tenants?.full_name}</span>
                  </div>
                  <Badge className="bg-amber-100 text-amber-700">
                    หมดอายุ {formatDate(c.end_date)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
