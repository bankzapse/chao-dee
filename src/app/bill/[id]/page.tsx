import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { PromptPayQR } from "@/components/promptpay-qr";
import {
  formatBaht,
  formatDate,
  formatPeriod,
  INVOICE_STATUS_LABEL,
} from "@/lib/format";
import type { Invoice } from "@/lib/types";

export const runtime = "nodejs";

export const metadata = {
  title: "ใบแจ้งหนี้ / ชำระเงิน",
  robots: { index: false, follow: false },
};

/**
 * หน้าบิลสาธารณะ — เปิดผ่านลิงก์ที่ส่งให้ผู้เช่าใน LINE OA
 * ใช้ service-role อ่านบิลด้วย id (uuid เดายาก) จึงไม่ต้องล็อกอิน
 */
export default async function PublicBillPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, rooms(room_number, buildings(name)), tenants(full_name)")
    .eq("id", id)
    .maybeSingle();

  if (!invoice) notFound();

  const inv = invoice as unknown as Invoice & {
    rooms: { room_number: string; buildings: { name: string } | null } | null;
    tenants: { full_name: string } | null;
  };

  const { data: org } = await supabase
    .from("organizations")
    .select("name, promptpay_id, promptpay_name, invoice_note")
    .eq("id", inv.org_id)
    .maybeSingle();

  const outstanding = Number(inv.total_amount) - Number(inv.paid_amount);
  const paid = inv.status === "paid" || outstanding <= 0;

  const rows: { label: string; amount: number }[] = [
    { label: "ค่าเช่าห้อง", amount: Number(inv.rent_amount) },
    { label: "ค่าน้ำ", amount: Number(inv.water_amount) },
    { label: "ค่าไฟฟ้า", amount: Number(inv.electric_amount) },
  ];
  if (Number(inv.parking_amount) > 0)
    rows.push({ label: "ค่าจอดรถ", amount: Number(inv.parking_amount) });
  if (Number(inv.other_amount) > 0)
    rows.push({ label: "ค่าใช้จ่ายอื่นๆ", amount: Number(inv.other_amount) });

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-md">
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          {/* header */}
          <div className="bg-indigo-600 px-6 py-5 text-white">
            <p className="text-sm text-indigo-100">ใบแจ้งหนี้</p>
            <h1 className="mt-0.5 text-lg font-bold">
              {org?.promptpay_name || org?.name || "หอพัก"}
            </h1>
            <p className="mt-1 text-sm text-indigo-100">
              รอบ {formatPeriod(inv.period)} · เลขที่ #{inv.id.slice(0, 8).toUpperCase()}
            </p>
          </div>

          <div className="px-6 py-5">
            {/* ผู้เช่า/ห้อง */}
            <div className="mb-4 flex items-start justify-between text-sm">
              <div>
                <p className="text-slate-400">ผู้เช่า</p>
                <p className="font-medium text-slate-900">
                  {inv.tenants?.full_name ?? "-"}
                </p>
                <p className="text-slate-500">
                  {inv.rooms?.buildings?.name ?? ""} · ห้อง {inv.rooms?.room_number ?? "-"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-slate-400">ครบกำหนด</p>
                <p className="font-medium text-rose-600">{formatDate(inv.due_date)}</p>
              </div>
            </div>

            {/* รายการ */}
            <div className="divide-y divide-slate-100 border-y border-slate-100">
              {rows.map((r, i) => (
                <div key={i} className="flex justify-between py-2 text-sm">
                  <span className="text-slate-600">{r.label}</span>
                  <span className="text-slate-900">{formatBaht(r.amount)}</span>
                </div>
              ))}
              {Number(inv.discount) > 0 && (
                <div className="flex justify-between py-2 text-sm">
                  <span className="text-emerald-600">ส่วนลด</span>
                  <span className="text-emerald-600">-{formatBaht(inv.discount)}</span>
                </div>
              )}
            </div>

            {/* ยอดรวม */}
            <div className="mt-3 flex items-center justify-between">
              <span className="text-base font-bold text-slate-900">
                {paid ? "ยอดรวมสุทธิ" : "ยอดที่ต้องชำระ"}
              </span>
              <span className="text-xl font-bold text-indigo-600">
                {formatBaht(paid ? inv.total_amount : outstanding)}
              </span>
            </div>
            {Number(inv.paid_amount) > 0 && !paid && (
              <p className="mt-1 text-right text-xs text-slate-400">
                (ชำระแล้ว {formatBaht(inv.paid_amount)} จาก {formatBaht(inv.total_amount)})
              </p>
            )}

            {/* สถานะ / QR */}
            {paid ? (
              <div className="mt-5 rounded-xl bg-emerald-50 p-4 text-center">
                <p className="text-2xl">✅</p>
                <p className="mt-1 font-semibold text-emerald-700">
                  {INVOICE_STATUS_LABEL.paid}
                </p>
                <p className="text-xs text-emerald-600">ขอบคุณที่ชำระเงินครับ</p>
              </div>
            ) : (
              <div className="mt-5 flex flex-col items-center gap-2 rounded-xl bg-slate-50 p-5">
                <PromptPayQR promptpayId={org?.promptpay_id ?? ""} amount={outstanding} />
                <p className="text-sm font-medium text-slate-700">
                  สแกนเพื่อชำระ {formatBaht(outstanding)}
                </p>
                <p className="mt-1 text-center text-xs text-slate-500">
                  โอนแล้ว <span className="font-medium">ส่งสลิปกลับมาในแชท LINE</span> ได้เลย
                  <br />
                  ผู้ดูแลจะตรวจสอบและอัปเดตยอดให้ครับ
                </p>
              </div>
            )}

            {org?.invoice_note && (
              <p className="mt-4 text-center text-xs text-slate-400">{org.invoice_note}</p>
            )}
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          ระบบจัดการหอพัก Chao-Dee · chao-dee.com
        </p>
      </div>
    </div>
  );
}
