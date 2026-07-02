import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState, StatCard } from "@/components/ui";
import { DeleteButton } from "@/components/action-form";
import { formatBaht, formatDate } from "@/lib/format";
import type { Building, BuildingExpense } from "@/lib/types";
import { AddExpenseButton } from "./expense-buttons";
import { deleteExpense } from "./actions";

type ExpenseRow = BuildingExpense & { buildings: { name: string } | null };

export default async function ExpensesPage() {
  const supabase = await createClient();
  const [{ data: expenses }, { data: buildings }] = await Promise.all([
    supabase
      .from("building_expenses")
      .select("*, buildings(name)")
      .order("expense_date", { ascending: false }),
    supabase.from("buildings").select("*").order("name"),
  ]);

  const list = (expenses ?? []) as unknown as ExpenseRow[];
  const total = list.reduce((s, e) => s + Number(e.amount), 0);

  const now = new Date();
  const thisMonth = list
    .filter((e) => {
      const d = new Date(e.expense_date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div>
      <PageHeader
        title="ค่าใช้จ่าย"
        subtitle="บันทึกค่าใช้จ่ายของแต่ละอาคาร"
        action={<AddExpenseButton buildings={(buildings ?? []) as Building[]} />}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <StatCard label="ค่าใช้จ่ายเดือนนี้" value={formatBaht(thisMonth)} accent="rose" />
        <StatCard label="ค่าใช้จ่ายรวมทั้งหมด" value={formatBaht(total)} accent="slate" />
      </div>

      {list.length === 0 ? (
        <EmptyState
          title="ยังไม่มีรายการค่าใช้จ่าย"
          action={<AddExpenseButton buildings={(buildings ?? []) as Building[]} />}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">วันที่</th>
                  <th className="px-4 py-3 font-medium">อาคาร</th>
                  <th className="px-4 py-3 font-medium">หมวดหมู่</th>
                  <th className="px-4 py-3 font-medium">หมายเหตุ</th>
                  <th className="px-4 py-3 text-right font-medium">จำนวนเงิน</th>
                  <th className="px-4 py-3 text-right font-medium">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600">{formatDate(e.expense_date)}</td>
                    <td className="px-4 py-3 text-slate-700">{e.buildings?.name ?? "-"}</td>
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
        </div>
      )}
    </div>
  );
}
