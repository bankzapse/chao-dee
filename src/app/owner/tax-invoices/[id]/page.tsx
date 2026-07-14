import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePerm } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlatformPayment } from "@/lib/platform-settings";
import { packageBySlug } from "@/lib/packages";
import { formatBaht, formatDate } from "@/lib/format";
import { COMPANY, splitVat } from "@/lib/company";
import { PrintButton } from "@/components/qr-code";
import { BrandMark } from "@/components/brand-mark";

export const dynamic = "force-dynamic";
export const metadata = { title: "ใบกำกับภาษี", robots: { index: false } };

type OrgTax = {
  name?: string;
  tax_name?: string;
  tax_id?: string;
  tax_address?: string;
  tax_branch?: string;
};

export default async function OwnerTaxInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePerm("payments");
  const { id } = await params;
  const admin = createAdminClient();

  const { data: pay } = await admin
    .from("subscription_payments")
    .select("*, organizations(name, tax_name, tax_id, tax_address, tax_branch)")
    .eq("id", id)
    .maybeSingle();
  if (!pay || pay.status !== "verified" || !pay.tax_invoice_no) notFound();

  const platform = await getPlatformPayment();
  const org = (pay.organizations as OrgTax | null) ?? {};

  // ประเภทผู้เสียภาษีของสมาชิก (แยก query + resilient เผื่อ prod ยังไม่ได้รัน 0037)
  const { data: etRow } = await admin
    .from("organizations")
    .select("tax_entity_type")
    .eq("id", pay.org_id)
    .maybeSingle();
  const isIndiv = (etRow as { tax_entity_type?: string } | null)?.tax_entity_type === "individual";
  const pkg = packageBySlug(pay.package_slug);
  const amount = Number(pay.amount);
  const { base, vat } = splitVat(amount);

  // ผู้ขาย/ผู้ออก (บริษัท) — ใช้ค่าจาก Console ถ้ามี ไม่งั้น fallback ไป lib/company
  const seller = {
    name: platform.tax_name || COMPANY.name,
    taxId: platform.tax_id || COMPANY.taxId,
    address: platform.tax_address || COMPANY.address,
    phone: platform.tax_phone || COMPANY.phone,
    branch: platform.tax_branch || "สำนักงานใหญ่",
  };

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      <div className="mx-auto max-w-2xl px-4 print:max-w-none print:px-0">
        <div className="mb-4 flex items-center justify-between print:hidden">
          <Link href="/owner/tax-invoices" className="text-sm text-slate-500 hover:text-slate-700">
            ← กลับ
          </Link>
          <PrintButton label="🖨️ พิมพ์ / บันทึก PDF" />
        </div>

        <div className="print-area rounded-2xl bg-white p-10 shadow-sm print:rounded-none print:shadow-none">
          {/* หัวเอกสาร */}
          <div className="flex items-start justify-between border-b border-slate-200 pb-6">
            <div className="flex items-center gap-3">
              <BrandMark size={44} />
              <div>
                <p className="text-lg font-bold text-slate-900">{seller.name}</p>
                <p className="text-xs text-slate-600">เลขประจำตัวผู้เสียภาษี {seller.taxId} · {seller.branch}</p>
                <p className="text-xs text-slate-400">{seller.address}</p>
                <p className="text-xs text-slate-400">
                  chao-dee.com{seller.phone ? ` · โทร ${seller.phone}` : ""}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-slate-900">ใบเสร็จรับเงิน / ใบกำกับภาษี</p>
              <p className="text-xs text-slate-500">RECEIPT / TAX INVOICE</p>
              <p className="mt-2 text-sm font-medium text-slate-700">เลขที่ {pay.tax_invoice_no}</p>
              <p className="text-xs text-slate-400">อ้างอิง CD-{String(pay.id).slice(0, 8).toUpperCase()}</p>
            </div>
          </div>

          {/* ผู้ซื้อ + วันที่ */}
          <div className="grid grid-cols-2 gap-6 py-6 text-sm">
            <div>
              <p className="text-slate-400">ผู้ซื้อ / ลูกค้า{isIndiv ? " (บุคคลธรรมดา)" : " (นิติบุคคล)"}</p>
              <p className="mt-1 font-medium text-slate-900">{org.tax_name || org.name || "-"}</p>
              {org.tax_id && (
                <p className="text-slate-500">
                  {isIndiv ? "เลขประจำตัวประชาชน" : "เลขประจำตัวผู้เสียภาษี"} {org.tax_id}
                </p>
              )}
              {!isIndiv && org.tax_branch && <p className="text-slate-500">{org.tax_branch}</p>}
              {org.tax_address && <p className="text-slate-500">{org.tax_address}</p>}
              {!org.tax_name && !org.tax_id && (
                <p className="text-xs text-amber-600">⚠ สมาชิกยังไม่กรอกข้อมูลผู้เสียภาษี</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-slate-400">วันที่</p>
              <p className="mt-1 font-medium text-slate-900">{formatDate(pay.paid_at)}</p>
              {pay.verified_at && (
                <p className="text-xs text-slate-400">ยืนยันเมื่อ {formatDate(pay.verified_at)}</p>
              )}
            </div>
          </div>

          {/* รายการ */}
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
                  แพ็คเกจ {pkg?.name ?? pay.package_slug} — {pay.cycle === "yearly" ? "รายปี" : "รายเดือน"}
                  {pay.period_start && pay.period_end && (
                    <span className="block text-xs text-slate-400">
                      รอบ {formatDate(pay.period_start)} – {formatDate(pay.period_end)}
                    </span>
                  )}
                </td>
                <td className="py-3 text-right text-slate-800">{formatBaht(base)}</td>
              </tr>
            </tbody>
          </table>

          {/* รวม + VAT */}
          <div className="mt-4 flex justify-end">
            <div className="w-64 space-y-1 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>มูลค่าสินค้า/บริการ</span>
                <span>{formatBaht(base)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>ภาษีมูลค่าเพิ่ม {COMPANY.vatRate}%</span>
                <span>{formatBaht(vat)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
                <span>รวมทั้งสิ้น</span>
                <span>{formatBaht(amount)}</span>
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-lg bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-700 print:bg-white">
            ✓ ชำระเงินเรียบร้อยแล้ว
          </div>
          <p className="mt-6 text-center text-xs text-slate-400">
            เอกสารนี้ออกโดยระบบ Chao-Dee · ชำระผ่าน {pay.method === "promptpay" ? "PromptPay" : "โอนเงิน"}
          </p>
        </div>
      </div>
    </div>
  );
}
