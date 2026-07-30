import Link from "next/link";
import { redirect } from "next/navigation";
import { getLiffTenant } from "@/lib/liff";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatBaht, formatDate, formatPeriod, INVOICE_STATUS_LABEL, INVOICE_STATUS_STYLE } from "@/lib/format";
import type { InvoiceStatus } from "@/lib/types";
import { LiffHeader } from "../liff-header";

export default async function LiffBills() {
  const tenant = await getLiffTenant();
  if (!tenant) redirect("/liff/link");

  const admin = createAdminClient();
  const { data } = await admin
    .from("invoices")
    .select("id, period, total_amount, paid_amount, due_date, status")
    .eq("tenant_id", tenant.id)
    .neq("status", "void")
    .order("period", { ascending: false })
    .limit(24);
  const bills = data ?? [];

  return (
    <div>
      <LiffHeader title="บิล / ยอดค้าง" />
      {bills.length === 0 ? (
        <p className="rounded-2xl bg-white p-8 text-center text-sm text-slate-400 ring-1 ring-slate-100">
          ยังไม่มีบิล
        </p>
      ) : (
        <div className="space-y-2.5">
          {bills.map((b) => {
            const outstanding = Number(b.total_amount) - Number(b.paid_amount);
            return (
              <Link
                key={b.id}
                href={`/bill/${b.id}`}
                className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 active:scale-[.98]"
              >
                <div>
                  <p className="font-semibold text-slate-900">รอบ {formatPeriod(b.period)}</p>
                  <p className="mt-0.5 text-xs text-slate-400">ครบกำหนด {formatDate(b.due_date)}</p>
                  <span
                    className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-xs ${
                      INVOICE_STATUS_STYLE[b.status as InvoiceStatus]
                    }`}
                  >
                    {INVOICE_STATUS_LABEL[b.status as InvoiceStatus]}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-slate-900">{formatBaht(b.total_amount)}</p>
                  {outstanding > 0 && (
                    <p className="text-xs text-rose-600">ค้าง {formatBaht(outstanding)}</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
      <p className="mt-4 text-center text-xs text-slate-400">แตะที่บิลเพื่อดูรายละเอียดและ QR ชำระเงิน</p>
    </div>
  );
}
