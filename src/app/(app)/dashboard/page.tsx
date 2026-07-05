import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, StatCard, EmptyState, Badge } from "@/components/ui";
import { formatBaht, formatNumber, formatDate } from "@/lib/format";
import { SeedDemoButton } from "./demo-button";

type ExpiringContract = {
  id: string;
  end_date: string | null;
  rooms: { room_number: string; buildings: { name: string } | null } | null;
  tenants: { full_name: string } | null;
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 86400000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);

  const [
    { count: buildingCount },
    { data: rooms },
    { data: activeContracts },
    { count: tenantCount },
    { data: expenses },
    { data: expiring },
  ] = await Promise.all([
    supabase.from("buildings").select("*", { count: "exact", head: true }),
    supabase.from("rooms").select("status"),
    supabase.from("contracts").select("rent_amount").eq("status", "active"),
    supabase.from("tenants").select("*", { count: "exact", head: true }),
    supabase
      .from("building_expenses")
      .select("amount")
      .gte("expense_date", monthStart),
    supabase
      .from("contracts")
      .select("id, end_date, rooms(room_number, buildings(name)), tenants(full_name)")
      .eq("status", "active")
      .not("end_date", "is", null)
      .lte("end_date", in30.toISOString().slice(0, 10))
      .order("end_date"),
  ]);

  const totalRooms = rooms?.length ?? 0;
  const occupied = (rooms ?? []).filter((r) => r.status === "occupied").length;
  const vacant = (rooms ?? []).filter((r) => r.status === "vacant").length;
  const occupancy = totalRooms > 0 ? Math.round((occupied / totalRooms) * 100) : 0;

  const revenue = (activeContracts ?? []).reduce(
    (s, c) => s + Number(c.rent_amount),
    0
  );
  const monthExpense = (expenses ?? []).reduce((s, e) => s + Number(e.amount), 0);
  const expiringList = (expiring ?? []) as unknown as ExpiringContract[];

  const isEmpty = (buildingCount ?? 0) === 0 && totalRooms === 0;

  return (
    <div>
      <PageHeader
        title="แดชบอร์ด"
        subtitle="ภาพรวมหอพักของคุณ"
        action={isEmpty ? <SeedDemoButton /> : undefined}
      />

      {isEmpty ? (
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
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="อัตราการเข้าพัก"
              value={`${occupancy}%`}
              hint={`${occupied}/${totalRooms} ห้อง`}
              accent="indigo"
            />
            <StatCard
              label="รายได้ค่าเช่า/เดือน"
              value={formatBaht(revenue)}
              hint="จากสัญญาที่ใช้งานอยู่"
              accent="emerald"
            />
            <StatCard
              label="ห้องว่าง"
              value={formatNumber(vacant)}
              hint={`จากทั้งหมด ${totalRooms} ห้อง`}
              accent="amber"
            />
            <StatCard
              label="ค่าใช้จ่ายเดือนนี้"
              value={formatBaht(monthExpense)}
              hint={`กำไรคาดการณ์ ${formatBaht(revenue - monthExpense)}`}
              accent="rose"
            />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <StatCard label="อาคาร" value={formatNumber(buildingCount ?? 0)} accent="slate" />
            <StatCard label="ห้องพักทั้งหมด" value={formatNumber(totalRooms)} accent="slate" />
            <StatCard label="ผู้เช่า" value={formatNumber(tenantCount ?? 0)} accent="slate" />
          </div>

          <div className="mt-6">
            <h2 className="mb-3 text-lg font-semibold text-slate-900">
              สัญญาใกล้หมดอายุ (ภายใน 30 วัน)
            </h2>
            {expiringList.length === 0 ? (
              <div className="card p-6 text-sm text-slate-500">
                ไม่มีสัญญาที่ใกล้หมดอายุ 🎉
              </div>
            ) : (
              <div className="card divide-y divide-slate-100">
                {expiringList.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between px-5 py-3 text-sm"
                  >
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
        </>
      )}
    </div>
  );
}
