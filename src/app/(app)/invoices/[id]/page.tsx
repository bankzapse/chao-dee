import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui";
import { PromptPayQR } from "@/components/promptpay-qr";
import {
  PrintButton,
  RecordPaymentButton,
  SendInvoiceLineButton,
} from "./invoice-actions";
import { DeleteButton } from "@/components/action-form";
import {
  formatBaht,
  formatDate,
  formatPeriod,
  formatNumber,
  INVOICE_STATUS_LABEL,
  INVOICE_STATUS_STYLE,
  PAYMENT_METHOD_LABEL,
} from "@/lib/format";
import type { Invoice, InvoiceStatus, Payment, PaymentMethod } from "@/lib/types";
import { deletePayment } from "../actions";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: invoice }, { data: org }, { data: payments }] = await Promise.all([
    supabase
      .from("invoices")
      .select("*, rooms(room_number, buildings(name)), tenants(full_name, phone)")
      .eq("id", id)
      .single(),
    supabase
      .from("organizations")
      .select("name, promptpay_id, promptpay_name, invoice_note")
      .single(),
    supabase
      .from("payments")
      .select("*")
      .eq("invoice_id", id)
      .order("paid_at", { ascending: true }),
  ]);

  if (!invoice) notFound();

  const inv = invoice as unknown as Invoice & {
    rooms: { room_number: string; buildings: { name: string } | null } | null;
    tenants: { full_name: string; phone: string } | null;
  };
  const pays = (payments ?? []) as Payment[];
  const outstanding = Number(inv.total_amount) - Number(inv.paid_amount);
  const today = new Date().toISOString().slice(0, 10);

  const rows = [
    { label: `ค่าเช่าห้อง`, detail: "", amount: Number(inv.rent_amount) },
    {
      label: "ค่าน้ำ",
      detail: `${formatNumber(inv.water_units)} หน่วย`,
      amount: Number(inv.water_amount),
    },
    {
      label: "ค่าไฟฟ้า",
      detail: `${formatNumber(inv.electric_units)} หน่วย`,
      amount: Number(inv.electric_amount),
    },
  ];
  if (Number(inv.other_amount) > 0)
    rows.push({ label: "ค่าใช้จ่ายอื่นๆ", detail: "", amount: Number(inv.other_amount) });

  return (
    <div className="mx-auto max-w-3xl">
      {/* toolbar */}
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href="/invoices" className="text-sm text-slate-500 hover:text-slate-700">
          ← กลับไปรายการบิล
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <PrintButton />
          <SendInvoiceLineButton invoiceId={inv.id} />
          {inv.status !== "void" && outstanding > 0 && (
            <RecordPaymentButton
              invoiceId={inv.id}
              outstanding={outstanding}
              today={today}
            />
          )}
        </div>
      </div>

      {/* invoice */}
      <div className="print-area card p-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {org?.promptpay_name || org?.name || "หอพัก"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">ใบแจ้งหนี้ / Invoice</p>
          </div>
          <div className="text-right text-sm">
            <p className="text-slate-500">เลขที่ #{inv.id.slice(0, 8).toUpperCase()}</p>
            <p className="mt-1 font-medium text-slate-900">รอบ {formatPeriod(inv.period)}</p>
            <Badge className={`mt-1 ${INVOICE_STATUS_STYLE[inv.status as InvoiceStatus]}`}>
              {INVOICE_STATUS_LABEL[inv.status as InvoiceStatus]}
            </Badge>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 border-y border-slate-100 py-4 text-sm">
          <div>
            <p className="text-slate-400">เรียกเก็บจาก</p>
            <p className="font-medium text-slate-900">{inv.tenants?.full_name ?? "-"}</p>
            <p className="text-slate-500">
              {inv.rooms?.buildings?.name} · ห้อง {inv.rooms?.room_number}
            </p>
            {inv.tenants?.phone && <p className="text-slate-500">โทร {inv.tenants.phone}</p>}
          </div>
          <div className="text-right">
            <p className="text-slate-400">วันที่ออกบิล</p>
            <p className="font-medium text-slate-900">{formatDate(inv.issue_date)}</p>
            <p className="mt-1 text-slate-400">ครบกำหนดชำระ</p>
            <p className="font-medium text-rose-600">{formatDate(inv.due_date)}</p>
          </div>
        </div>

        {/* charges */}
        <table className="mt-4 w-full text-sm">
          <thead className="text-left text-slate-400">
            <tr>
              <th className="py-2 font-medium">รายการ</th>
              <th className="py-2 text-right font-medium">จำนวนเงิน</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r, idx) => (
              <tr key={idx}>
                <td className="py-2 text-slate-700">
                  {r.label}
                  {r.detail && <span className="ml-2 text-xs text-slate-400">({r.detail})</span>}
                </td>
                <td className="py-2 text-right text-slate-900">{formatBaht(r.amount)}</td>
              </tr>
            ))}
            {Number(inv.discount) > 0 && (
              <tr>
                <td className="py-2 text-emerald-600">ส่วนลด</td>
                <td className="py-2 text-right text-emerald-600">
                  -{formatBaht(inv.discount)}
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200">
              <td className="py-3 text-base font-bold text-slate-900">ยอดรวมสุทธิ</td>
              <td className="py-3 text-right text-base font-bold text-indigo-600">
                {formatBaht(inv.total_amount)}
              </td>
            </tr>
            {Number(inv.paid_amount) > 0 && (
              <>
                <tr>
                  <td className="py-1 text-sm text-slate-500">ชำระแล้ว</td>
                  <td className="py-1 text-right text-sm text-emerald-600">
                    {formatBaht(inv.paid_amount)}
                  </td>
                </tr>
                <tr>
                  <td className="py-1 text-sm font-medium text-slate-700">คงเหลือ</td>
                  <td className="py-1 text-right text-sm font-bold text-rose-600">
                    {formatBaht(outstanding)}
                  </td>
                </tr>
              </>
            )}
          </tfoot>
        </table>

        {/* PromptPay + note */}
        {inv.status !== "void" && outstanding > 0 && (
          <div className="mt-6 flex flex-col items-center gap-2 rounded-xl bg-slate-50 p-5">
            <PromptPayQR promptpayId={org?.promptpay_id ?? ""} amount={outstanding} />
            <p className="text-xs text-slate-500">
              สแกนเพื่อชำระ {formatBaht(outstanding)}
            </p>
          </div>
        )}

        {org?.invoice_note && (
          <p className="mt-4 text-center text-xs text-slate-400">{org.invoice_note}</p>
        )}
      </div>

      {/* payments history */}
      <div className="no-print mt-6">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">ประวัติการชำระ</h2>
        {pays.length === 0 ? (
          <div className="card p-6 text-sm text-slate-500">ยังไม่มีการชำระเงิน</div>
        ) : (
          <div className="card divide-y divide-slate-100">
            {pays.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <div>
                  <span className="font-medium text-slate-900">{formatBaht(p.amount)}</span>
                  <span className="ml-2 text-slate-500">
                    {PAYMENT_METHOD_LABEL[p.method as PaymentMethod]} · {formatDate(p.paid_at)}
                  </span>
                  {p.note && <span className="ml-2 text-slate-400">— {p.note}</span>}
                </div>
                <DeleteButton action={deletePayment.bind(null, p.id)} confirmText="ลบรายการชำระนี้?" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
