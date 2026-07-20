import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatBaht, formatDate } from "@/lib/format";
import { COMPANY } from "@/lib/company";
import { PrintButton } from "@/components/qr-code";
import { BrandMark } from "@/components/brand-mark";

export const dynamic = "force-dynamic";
export const metadata = { title: "ใบเสร็จค่านายหน้า", robots: { index: false } };

export default async function CommissionReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // RLS: เห็นเฉพาะดีลของกิจการตัวเอง
  const { data } = await supabase
    .from("agency_deals")
    .select("id, status, lead_name, rent_base, commission_amount, signed_at, paid_at, created_at")
    .eq("id", id)
    .maybeSingle();
  const d = data as {
    id: string;
    status: string;
    lead_name: string;
    rent_base: number;
    commission_amount: number;
    signed_at: string | null;
    paid_at: string | null;
  } | null;
  if (!d || d.status !== "paid") notFound();

  const { data: org } = await supabase.from("organizations").select("name, tax_name, tax_id, tax_address").maybeSingle();
  const o = (org as { name?: string; tax_name?: string; tax_id?: string; tax_address?: string } | null) ?? {};
  const no = `AGC-${String(d.id).slice(0, 8).toUpperCase()}`;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="no-print mb-4 flex items-center justify-between">
        <Link href="/agency" className="text-sm text-slate-500 hover:text-slate-700">
          ← กลับดีลนายหน้า
        </Link>
        <PrintButton label="🖨️ พิมพ์ / บันทึก PDF" />
      </div>

      <div className="print-area card p-10">
        <div className="flex items-start justify-between border-b border-slate-200 pb-6">
          <div className="flex items-center gap-3">
            <BrandMark size={44} />
            <div>
              <p className="text-lg font-bold text-slate-900">{COMPANY.name}</p>
              <p className="text-xs text-slate-600">เลขประจำตัวผู้เสียภาษี {COMPANY.taxId}</p>
              <p className="text-xs text-slate-400">{COMPANY.address}</p>
              <p className="text-xs text-slate-400">chao-dee.com · {COMPANY.email}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-slate-900">ใบเสร็จรับเงิน</p>
            <p className="text-xs text-slate-500">RECEIPT · ค่านายหน้า</p>
            <p className="mt-2 text-sm font-medium text-slate-700">เลขที่ {no}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 py-6 text-sm">
          <div>
            <p className="text-slate-400">ผู้ชำระเงิน</p>
            <p className="mt-1 font-medium text-slate-900">{o.tax_name || o.name || "-"}</p>
            {o.tax_id && <p className="text-slate-500">เลขผู้เสียภาษี {o.tax_id}</p>}
            {o.tax_address && <p className="text-slate-500">{o.tax_address}</p>}
          </div>
          <div className="text-right">
            <p className="text-slate-400">วันที่ชำระ</p>
            <p className="mt-1 font-medium text-slate-900">{d.paid_at ? formatDate(d.paid_at) : "-"}</p>
          </div>
        </div>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-y border-slate-200 text-left text-slate-500">
              <th className="py-2 font-medium">รายการ</th>
              <th className="py-2 text-right font-medium">จำนวนเงิน</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="py-3 text-slate-800">
                ค่านายหน้าจัดหาผู้เช่า — {d.lead_name || "ผู้เช่า"}
                <span className="block text-xs text-slate-400">
                  ค่าเช่า {formatBaht(d.rent_base)}/เดือน × 1 เดือน
                  {d.signed_at ? ` · เซ็นสัญญา ${formatDate(d.signed_at)}` : ""}
                </span>
              </td>
              <td className="py-3 text-right text-slate-800">{formatBaht(d.commission_amount)}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-4 flex justify-end">
          <div className="w-64 space-y-1 text-sm">
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
              <span>รวมทั้งสิ้น</span>
              <span>{formatBaht(d.commission_amount)}</span>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-lg bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-700 print:bg-white">
          ✓ ชำระเงินเรียบร้อยแล้ว
        </div>
        {!COMPANY.vatRegistered && (
          <p className="mt-4 text-center text-xs text-slate-400">
            * ราคานี้ไม่มีภาษีมูลค่าเพิ่ม (ผู้ประกอบการยังไม่ได้จดทะเบียน VAT)
          </p>
        )}
        <p className="mt-2 text-center text-xs text-slate-400">เอกสารนี้ออกโดยระบบ Chao-Dee</p>
      </div>
    </div>
  );
}
