import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState, StatCard, Badge } from "@/components/ui";
import { PeriodSelect } from "@/components/period-select";
import { GenerateButton } from "./generate-button";
import {
  formatBaht,
  formatPeriod,
  currentPeriod,
  recentPeriods,
  INVOICE_STATUS_LABEL,
  INVOICE_STATUS_STYLE,
} from "@/lib/format";
import type { Invoice, InvoiceStatus } from "@/lib/types";

type InvoiceRow = Invoice & {
  rooms: { room_number: string; buildings: { name: string } | null } | null;
  tenants: { full_name: string } | null;
};

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: periodParam } = await searchParams;
  const period = periodParam || currentPeriod();
  const periods = recentPeriods(12);
  if (!periods.includes(period)) periods.unshift(period);

  const supabase = await createClient();
  const { data } = await supabase
    .from("invoices")
    .select("*, rooms(room_number, buildings(name)), tenants(full_name)")
    .eq("period", period)
    .order("created_at", { ascending: true });

  const list = (data ?? []) as unknown as InvoiceRow[];
  const totalBilled = list
    .filter((i) => i.status !== "void")
    .reduce((s, i) => s + Number(i.total_amount), 0);
  const totalPaid = list.reduce((s, i) => s + Number(i.paid_amount), 0);
  const outstanding = totalBilled - totalPaid;

  return (
    <div>
      <PageHeader
        title="บิล / ใบแจ้งหนี้"
        subtitle={`รอบเดือน ${formatPeriod(period)}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <PeriodSelect periods={periods} value={period} />
            <GenerateButton period={period} />
          </div>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="ยอดออกบิลรวม" value={formatBaht(totalBilled)} accent="slate" />
        <StatCard label="รับชำระแล้ว" value={formatBaht(totalPaid)} accent="emerald" />
        <StatCard label="ค้างชำระ" value={formatBaht(outstanding)} accent="rose" />
      </div>

      {list.length === 0 ? (
        <EmptyState
          title="ยังไม่มีบิลในรอบนี้"
          description="กด “ออกบิลรอบนี้” เพื่อสร้างบิลอัตโนมัติจากค่าเช่า + ค่ามิเตอร์ของห้องที่มีสัญญา"
          action={<GenerateButton period={period} />}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">ห้อง</th>
                  <th className="px-4 py-3 font-medium">ผู้เช่า</th>
                  <th className="px-4 py-3 font-medium">ครบกำหนด</th>
                  <th className="px-4 py-3 text-right font-medium">ยอดรวม</th>
                  <th className="px-4 py-3 text-right font-medium">ค้าง</th>
                  <th className="px-4 py-3 font-medium">สถานะ</th>
                  <th className="px-4 py-3 text-right font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((i) => (
                  <tr key={i.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {i.rooms?.buildings?.name ?? "-"} · {i.rooms?.room_number ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {i.tenants?.full_name ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{i.due_date}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {formatBaht(i.total_amount)}
                    </td>
                    <td className="px-4 py-3 text-right text-rose-600">
                      {formatBaht(Number(i.total_amount) - Number(i.paid_amount))}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={INVOICE_STATUS_STYLE[i.status as InvoiceStatus]}>
                        {INVOICE_STATUS_LABEL[i.status as InvoiceStatus]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/invoices/${i.id}`}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                      >
                        เปิดบิล →
                      </Link>
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
