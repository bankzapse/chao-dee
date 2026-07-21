import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState, StatCard, Badge } from "@/components/ui";
import { FilterChip, PendingLink } from "@/components/nav";
import { PeriodSelect } from "@/components/period-select";
import { DeleteButton } from "@/components/action-form";
import { GenerateButton, RecalcButton } from "./generate-button";
import { deleteInvoice } from "./actions";
import {
  formatBaht,
  formatDate,
  formatPeriod,
  currentPeriod,
  recentPeriods,
  INVOICE_STATUS_LABEL,
  INVOICE_STATUS_STYLE,
} from "@/lib/format";
import type { Invoice, InvoiceStatus, Building } from "@/lib/types";

export const dynamic = "force-dynamic";

type InvoiceRow = Invoice & {
  rooms: { room_number: string; building_id: string; buildings: { name: string } | null } | null;
  tenants: { full_name: string; phone: string } | null;
};

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; building?: string }>;
}) {
  const { period: periodParam, building } = await searchParams;
  const period = periodParam || currentPeriod();
  const periods = recentPeriods(12);
  if (!periods.includes(period)) periods.unshift(period);

  const supabase = await createClient();
  const [{ data }, { data: buildings }] = await Promise.all([
    supabase
      .from("invoices")
      .select("*, rooms(room_number, building_id, buildings(name)), tenants(full_name, phone)")
      .eq("period", period)
      .order("created_at", { ascending: true }),
    supabase.from("buildings").select("*").order("name"),
  ]);

  const buildingList = (buildings ?? []) as Building[];
  const all = (data ?? []) as unknown as InvoiceRow[];

  // ดูทีละอาคารเสมอ — รวมทุกอาคารไว้หน้าเดียวแล้วสับสน
  // ไม่ได้เลือก (หรือเลือกอาคารที่ไม่มีอยู่) → ใช้อาคารแรก
  const selected =
    buildingList.find((b) => b.id === building)?.id ?? buildingList[0]?.id ?? "";
  const list = selected ? all.filter((i) => i.rooms?.building_id === selected) : all;

  // จำนวนบิลของแต่ละอาคาร (โชว์บนชิป จะได้รู้ว่าอาคารไหนออกบิลไปแล้วกี่ใบ)
  const countByBuilding = new Map<string, number>();
  all.forEach((i) => {
    const id = i.rooms?.building_id;
    if (id) countByBuilding.set(id, (countByBuilding.get(id) ?? 0) + 1);
  });

  const sumBilled = (rows: InvoiceRow[]) =>
    rows.filter((i) => i.status !== "void").reduce((s, i) => s + Number(i.total_amount), 0);
  const sumPaid = (rows: InvoiceRow[]) => rows.reduce((s, i) => s + Number(i.paid_amount), 0);

  const totalBilled = sumBilled(list);
  const totalPaid = sumPaid(list);
  const outstanding = totalBilled - totalPaid;

  const rows = [...list].sort((a, b) =>
    (a.rooms?.room_number ?? "").localeCompare(b.rooms?.room_number ?? "", undefined, {
      numeric: true,
    })
  );

  const scope = buildingList.find((b) => b.id === selected)?.name ?? "ทุกอาคาร";

  return (
    <div>
      <PageHeader
        title="บิล / ใบแจ้งหนี้"
        subtitle={`รอบเดือน ${formatPeriod(period)} · ${scope}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <PeriodSelect periods={periods} value={period} />
            <RecalcButton period={period} />
            <GenerateButton period={period} />
          </div>
        }
      />

      {buildingList.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {buildingList.map((b) => (
            <FilterChip
              key={b.id}
              href={`/invoices?period=${period}&building=${b.id}`}
              label={`${b.name} (${countByBuilding.get(b.id) ?? 0})`}
              active={selected === b.id}
            />
          ))}
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label={`ยอดออกบิลรวม · ${scope}`} value={formatBaht(totalBilled)} accent="slate" />
        <StatCard label="รับชำระแล้ว" value={formatBaht(totalPaid)} accent="emerald" />
        <StatCard label="ค้างชำระ" value={formatBaht(outstanding)} accent="rose" />
      </div>

      {list.length === 0 ? (
        <EmptyState
          title={`ยังไม่มีบิลของ${scope} ในรอบนี้`}
          description="กด “ออกบิลรอบนี้” เพื่อสร้างบิลอัตโนมัติจากค่าเช่า + ค่ามิเตอร์ของห้องที่มีสัญญา (ออกให้ทุกอาคารพร้อมกัน)"
          action={<GenerateButton period={period} />}
        />
      ) : (
        <section className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700">🏢 {scope}</h2>
            <span className="text-xs text-slate-500">
              {rows.length} บิล · ออกบิล <b className="text-slate-700">{formatBaht(totalBilled)}</b>
              {outstanding > 0 && (
                <>
                  {" "}
                  · ค้าง <b className="text-rose-600">{formatBaht(outstanding)}</b>
                </>
              )}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 text-left text-slate-400">
                <tr>
                  <th className="px-4 py-2 font-medium">ห้อง</th>
                  <th className="px-4 py-2 font-medium">ผู้เช่า</th>
                  <th className="px-4 py-2 font-medium">ครบกำหนด</th>
                  <th className="px-4 py-2 text-right font-medium">ยอดรวม</th>
                  <th className="px-4 py-2 text-right font-medium">ค้าง</th>
                  <th className="px-4 py-2 font-medium">สถานะ</th>
                  <th className="px-4 py-2 text-right font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((i) => (
                  <tr key={i.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      🚪 {i.rooms?.room_number ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <p>{i.tenants?.full_name ?? "-"}</p>
                      {i.tenants?.phone && (
                        <a
                          href={`tel:${i.tenants.phone}`}
                          className="text-xs text-indigo-600 hover:text-indigo-700"
                        >
                          📞 {i.tenants.phone}
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(i.due_date)}</td>
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
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <PendingLink
                          href={`/invoices/${i.id}`}
                          className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                        >
                          เปิดบิล →
                        </PendingLink>
                        <DeleteButton
                          action={deleteInvoice.bind(null, i.id)}
                          confirmText={`ลบบิลห้อง ${i.rooms?.room_number ?? "-"} รอบ ${formatPeriod(
                            i.period
                          )}? (ลบรายการชำระที่ผูกกับบิลนี้ด้วย)`}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
