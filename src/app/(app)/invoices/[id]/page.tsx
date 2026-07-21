import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui";
import { PaymentBox } from "@/components/payment-box";
import { type BankInfo } from "@/components/bank-info";
import {
  PrintButton,
  RecordPaymentButton,
  SendInvoiceLineButton,
  EditInvoiceButton,
  AddInvoiceItemButton,
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
import type { Invoice, InvoiceItem, InvoiceStatus, Payment, PaymentMethod } from "@/lib/types";
import { deletePayment, deleteInvoiceItem } from "../actions";

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

  // ค่าใช้จ่ายอื่นๆ รายบรรทัด (invoice_items)
  const { data: itemRows } = await supabase
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", id)
    .order("created_at", { ascending: true });
  const items = (itemRows ?? []) as InvoiceItem[];

  if (!invoice) notFound();

  // บัญชีธนาคาร (แยก query + resilient เผื่อยังไม่ได้รัน migration 0033)
  const { data: bankRow } = await supabase
    .from("organizations")
    .select("bank_name, bank_account_no, bank_account_name")
    .maybeSingle();
  const bank: BankInfo = {
    bank_name: (bankRow as { bank_name?: string } | null)?.bank_name ?? "",
    bank_account_no: (bankRow as { bank_account_no?: string } | null)?.bank_account_no ?? "",
    bank_account_name: (bankRow as { bank_account_name?: string } | null)?.bank_account_name ?? "",
  };
  const { data: pmRow } = await supabase.from("organizations").select("payment_method").maybeSingle();
  const paymentMethod = ((pmRow as { payment_method?: string } | null)?.payment_method ?? "promptpay") as
    | "promptpay"
    | "bank";

  const inv = invoice as unknown as Invoice & {
    rooms: { room_number: string; buildings: { name: string } | null } | null;
    tenants: { full_name: string; phone: string } | null;
  };
  const pays = (payments ?? []) as Payment[];
  const outstanding = Number(inv.total_amount) - Number(inv.paid_amount);
  const today = new Date().toISOString().slice(0, 10);

  // เลขมิเตอร์ก่อน/หลัง (จากการจดมิเตอร์) เพื่อแสดงในบิล
  const { data: readings } = await supabase
    .from("meter_readings")
    .select("period, water_value, electric_value")
    .eq("room_id", inv.room_id)
    .lte("period", inv.period)
    .order("period", { ascending: false })
    .limit(2);
  const curR = readings?.[0];
  const prevR = readings?.[1];
  const meterDetail = (prev?: number, cur?: number, units?: number) =>
    prev != null && cur != null
      ? `เลขก่อน ${formatNumber(prev)} → เลขหลัง ${formatNumber(cur)} = ${formatNumber(units ?? 0)} หน่วย`
      : `${formatNumber(units ?? 0)} หน่วย`;

  const rows = [
    { label: `ค่าเช่าห้อง`, detail: "", amount: Number(inv.rent_amount) },
    {
      label: "ค่าน้ำ",
      detail:
        Number(inv.occupant_count) > 0
          ? `เหมาจ่าย ${formatNumber(inv.occupant_count)} คน`
          : meterDetail(prevR?.water_value, curR?.water_value, Number(inv.water_units)),
      amount: Number(inv.water_amount),
    },
    {
      label: "ค่าไฟฟ้า",
      detail: meterDetail(prevR?.electric_value, curR?.electric_value, Number(inv.electric_units)),
      amount: Number(inv.electric_amount),
    },
  ];
  // แสดงทุกรายการเสมอ ถ้าไม่มีค่าให้ขึ้น "-" เพื่อให้ผู้เช่าเห็นว่าไม่ได้ถูกเก็บ (ไม่ใช่ตกหล่น)
  rows.push({ label: "ค่าจอดรถ", detail: "", amount: Number(inv.parking_amount) });
  rows.push({ label: "ค่าขยะ", detail: "", amount: Number(inv.garbage_amount) });
  // ไม่มีรายการย่อย → แสดงยอดรวมอื่นๆ แถวเดียว (บิลเก่าที่ยังไม่ได้แยกรายการ)
  if (items.length === 0) {
    rows.push({ label: "ค่าใช้จ่ายอื่นๆ", detail: "", amount: Number(inv.other_amount) });
  }

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
          {inv.status !== "void" && (
            <>
              <EditInvoiceButton inv={inv} />
              <AddInvoiceItemButton invoiceId={inv.id} />
            </>
          )}
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
                <td className={`py-2 ${r.amount > 0 ? "text-slate-700" : "text-slate-400"}`}>
                  {r.label}
                  {r.amount > 0 && r.detail && (
                    <span className="ml-2 text-xs text-slate-400">({r.detail})</span>
                  )}
                </td>
                <td className={`py-2 text-right ${r.amount > 0 ? "text-slate-900" : "text-slate-400"}`}>
                  {r.amount > 0 ? formatBaht(r.amount) : "-"}
                </td>
              </tr>
            ))}
            {items.map((it) => (
              <tr key={it.id}>
                <td className="py-2 text-slate-700">
                  {it.description}
                  <span className="ml-2 text-xs text-slate-400">(ค่าใช้จ่ายอื่นๆ)</span>
                </td>
                <td className="py-2 text-right text-slate-900">
                  <span className="inline-flex items-center gap-3">
                    {formatBaht(it.amount)}
                    <span className="no-print">
                      <DeleteButton
                        action={deleteInvoiceItem.bind(null, it.id)}
                        confirmText={`ลบรายการ "${it.description}" ออกจากบิล?`}
                        label="✕"
                      />
                    </span>
                  </span>
                </td>
              </tr>
            ))}
            <tr>
              <td className={`py-2 ${Number(inv.discount) > 0 ? "text-emerald-600" : "text-slate-400"}`}>
                ส่วนลด
              </td>
              <td
                className={`py-2 text-right ${
                  Number(inv.discount) > 0 ? "text-emerald-600" : "text-slate-400"
                }`}
              >
                {Number(inv.discount) > 0 ? `-${formatBaht(inv.discount)}` : "-"}
              </td>
            </tr>
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

        {/* PromptPay + บัญชีธนาคาร + note */}
        {inv.status !== "void" && outstanding > 0 && (
          <div className="mt-6 flex flex-col items-center gap-2 rounded-xl bg-slate-50 p-5">
            <PaymentBox
              method={paymentMethod}
              promptpayId={org?.promptpay_id ?? ""}
              bank={bank}
              amount={outstanding}
            />
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
