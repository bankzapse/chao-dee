import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState, StatCard } from "@/components/ui";
import { DeleteButton } from "@/components/action-form";
import { formatBaht, formatDate } from "@/lib/format";
import type { Building, BuildingExpense } from "@/lib/types";
import { AddExpenseButton } from "./expense-buttons";
import { deleteExpense } from "./actions";

export const dynamic = "force-dynamic";

type ExpenseRow = BuildingExpense & { buildings: { name: string } | null };

const NO_BUILDING = "— ไม่ระบุอาคาร —";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ building?: string }>;
}) {
  const { building } = await searchParams;
  const supabase = await createClient();

  let q = supabase
    .from("building_expenses")
    .select("*, buildings(name)")
    .order("expense_date", { ascending: false });
  if (building) q = q.eq("building_id", building);

  const [{ data: expenses }, { data: buildings }] = await Promise.all([
    q,
    supabase.from("buildings").select("*").order("name"),
  ]);

  const list = (expenses ?? []) as unknown as ExpenseRow[];
  const buildingList = (buildings ?? []) as Building[];

  const now = new Date();
  const isThisMonth = (d: string) => {
    const x = new Date(d);
    return x.getMonth() === now.getMonth() && x.getFullYear() === now.getFullYear();
  };
  const sum = (arr: ExpenseRow[]) => arr.reduce((s, e) => s + Number(e.amount), 0);

  const total = sum(list);
  const thisMonth = sum(list.filter((e) => isThisMonth(e.expense_date)));
  const scope = building ? buildingList.find((b) => b.id === building)?.name ?? "" : "ทุกอาคาร";

  // จัดกลุ่มตามอาคาร (คง order วันที่ล่าสุดก่อนที่ query มาแล้ว)
  const byBuilding = new Map<string, ExpenseRow[]>();
  for (const e of list) {
    const name = e.buildings?.name ?? NO_BUILDING;
    if (!byBuilding.has(name)) byBuilding.set(name, []);
    byBuilding.get(name)!.push(e);
  }
  const groups = [...byBuilding.keys()].sort((a, b) => {
    if (a === NO_BUILDING) return 1;
    if (b === NO_BUILDING) return -1;
    return a.localeCompare(b, "th");
  });

  return (
    <div>
      <PageHeader
        title="ค่าใช้จ่าย"
        subtitle={`บันทึกค่าใช้จ่ายของแต่ละอาคาร · ${scope}`}
        action={<AddExpenseButton buildings={buildingList} />}
      />

      {buildingList.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <FilterChip href="/expenses" label="ทุกอาคาร" active={!building} />
          {buildingList.map((b) => (
            <FilterChip
              key={b.id}
              href={`/expenses?building=${b.id}`}
              label={b.name}
              active={building === b.id}
            />
          ))}
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <StatCard label={`ค่าใช้จ่ายเดือนนี้ · ${scope}`} value={formatBaht(thisMonth)} accent="rose" />
        <StatCard label={`ค่าใช้จ่ายรวมทั้งหมด · ${scope}`} value={formatBaht(total)} accent="slate" />
      </div>

      {list.length === 0 ? (
        <EmptyState
          title="ยังไม่มีรายการค่าใช้จ่าย"
          action={<AddExpenseButton buildings={buildingList} />}
        />
      ) : (
        <div className="space-y-6">
          {groups.map((name) => {
            const rows = byBuilding.get(name)!;
            const gTotal = sum(rows);
            const gMonth = sum(rows.filter((e) => isThisMonth(e.expense_date)));
            return (
              <section key={name} className="card overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700">🏢 {name}</h2>
                  <span className="text-xs text-slate-500">
                    {rows.length} รายการ · เดือนนี้{" "}
                    <b className="text-rose-600">{formatBaht(gMonth)}</b> · รวม{" "}
                    <b className="text-slate-700">{formatBaht(gTotal)}</b>
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-slate-100 text-left text-slate-400">
                      <tr>
                        <th className="px-4 py-2 font-medium">วันที่</th>
                        <th className="px-4 py-2 font-medium">หมวดหมู่</th>
                        <th className="px-4 py-2 font-medium">หมายเหตุ</th>
                        <th className="px-4 py-2 text-right font-medium">จำนวนเงิน</th>
                        <th className="px-4 py-2 text-right font-medium">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rows.map((e) => (
                        <tr key={e.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-slate-600">{formatDate(e.expense_date)}</td>
                          <td className="px-4 py-3 text-slate-600">{e.category}</td>
                          <td className="px-4 py-3 text-slate-500">{e.note || "-"}</td>
                          <td className="px-4 py-3 text-right font-semibold text-rose-600">
                            {formatBaht(e.amount)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <DeleteButton
                              action={deleteExpense.bind(null, e.id)}
                              confirmText="ลบรายการนี้?"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterChip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
        active ? "bg-indigo-600 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {label}
    </Link>
  );
}
