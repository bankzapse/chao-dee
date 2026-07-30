import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatBaht, formatDate } from "@/lib/format";
import { COMPANY } from "@/lib/company";
import { commissionBreakdown, WHT_RATE } from "@/lib/agency";
import { PrintButton } from "@/components/qr-code";
import { BrandMark } from "@/components/brand-mark";

export const dynamic = "force-dynamic";
export const metadata = { title: "ใบแจ้งหนี้ค่านายหน้า", robots: { index: false } };

export default async function CommissionInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // RLS: เห็นเฉพาะดีลของกิจการตัวเอง
  const { data } = await supabase
    .from("agency_deals")
    .select("id, status, lead_name, rent_base, commission_amount, signed_at, invoiced_at, paid_at")
    .eq("id", id)
    .maybeSingle();
  const d = data as {
    id: string;
    status: string;
    lead_name: string;
    rent_base: number;
    commission_amount: number;
    signed_at: string | null;
    invoiced_at: string | null;
    paid_at: string | null;
  } | null;
  // ใบแจ้งหนี้เกิดตั้งแต่ "วางบิล" เป็นต้นไป
  if (!d || !["invoiced", "paid"].includes(d.status)) notFound();

  const { data: org } = await supabase
    .from("organizations")
    .select("name, tax_name, tax_id, tax_address, tax_entity_type")
    .maybeSingle();
  const o = (org as {
    name?: string;
    tax_name?: string;
    tax_id?: string;
    tax_address?: string;
    tax_entity_type?: string;
  } | null) ?? {};

  const no = `INV-AGC-${String(d.id).slice(0, 8).toUpperCase()}`;
  const paid = d.status === "paid";
  const promptpay = process.env.NEXT_PUBLIC_PLATFORM_PROMPTPAY || "";

  const tax = commissionBreakdown(d.commission_amount, {
    vatRegistered: COMPANY.vatRegistered,
    vatRate: COMPANY.vatRate,
    isJuristic: (o.tax_entity_type ?? "juristic") === "juristic",
  });

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
            <p className="text-lg font-bold text-slate-900">ใบแจ้งหนี้</p>
            <p className="text-xs text-slate-500">INVOICE · ค่านายหน้า</p>
            <p className="mt-2 text-sm font-medium text-slate-700">เลขที่ {no}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 py-6 text-sm">
          <div>
            <p className="text-slate-400">เรียกเก็บจาก</p>
            <p className="mt-1 font-medium text-slate-900">{o.tax_name || o.name || "-"}</p>
            {o.tax_id && <p className="text-slate-500">เลขผู้เสียภาษี {o.tax_id}</p>}
            {o.tax_address && <p className="text-slate-500">{o.tax_address}</p>}
          </div>
          <div className="text-right">
            <p className="text-slate-400">วันที่วางบิล</p>
            <p className="mt-1 font-medium text-slate-900">{d.invoiced_at ? formatDate(d.invoiced_at) : "-"}</p>
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
              <td className="py-3 text-right text-slate-800">{formatBaht(tax.base)}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-4 flex justify-end">
          <div className="w-72 space-y-1.5 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>ค่านายหน้า (ฐาน)</span>
              <span>{formatBaht(tax.base)}</span>
            </div>
            {tax.vat > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>ภาษีมูลค่าเพิ่ม {COMPANY.vatRate}%</span>
                <span>{formatBaht(tax.vat)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-1.5 font-semibold text-slate-900">
              <span>รวม</span>
              <span>{formatBaht(tax.total)}</span>
            </div>
            {tax.wht > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>หัก ณ ที่จ่าย {WHT_RATE}%</span>
                <span>-{formatBaht(tax.wht)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
              <span>ยอดชำระสุทธิ</span>
              <span>{formatBaht(tax.net)}</span>
            </div>
          </div>
        </div>

        {paid ? (
          <div className="mt-8 rounded-lg bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-700 print:bg-white">
            ✓ ชำระเงินแล้ว {d.paid_at ? `เมื่อ ${formatDate(d.paid_at)}` : ""}
          </div>
        ) : (
          <div className="mt-8 rounded-lg bg-amber-50 px-4 py-4 text-sm text-amber-800 print:bg-white">
            <p className="font-semibold">วิธีชำระค่านายหน้า</p>
            <ol className="mt-1.5 list-decimal space-y-0.5 pl-5">
              {promptpay && (
                <li>
                  โอนยอด <span className="font-semibold">{formatBaht(tax.net)}</span> ผ่าน PromptPay{" "}
                  <span className="font-semibold">{promptpay}</span> ({COMPANY.name})
                </li>
              )}
              {!promptpay && <li>โอนยอด {formatBaht(tax.net)} ให้ {COMPANY.name}</li>}
              <li>แนบสลิปในหน้า “ดีลนายหน้า” เพื่อให้ทีมงานตรวจสอบและยืนยัน</li>
            </ol>
          </div>
        )}

        {tax.wht > 0 && (
          <p className="mt-4 text-center text-xs text-slate-500">
            ผู้จ่ายเป็นนิติบุคคล — หักภาษี ณ ที่จ่าย {WHT_RATE}% ({formatBaht(tax.wht)}) แล้วโอนสุทธิ {formatBaht(tax.net)}
            <br />
            กรุณาออกหนังสือรับรองการหักภาษี ณ ที่จ่ายให้ {COMPANY.name}
          </p>
        )}
        {!COMPANY.vatRegistered && (
          <p className="mt-2 text-center text-xs text-slate-400">
            * ราคานี้ไม่มีภาษีมูลค่าเพิ่ม (ผู้ประกอบการยังไม่ได้จดทะเบียน VAT)
          </p>
        )}
        <p className="mt-2 text-center text-xs text-slate-400">เอกสารนี้ออกโดยระบบ Chao-Dee</p>
      </div>
    </div>
  );
}
