import Link from "next/link";
import { requirePerm } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { StatCard, Badge } from "@/components/ui";
import { packageBySlug } from "@/lib/packages";
import { formatBaht, formatDate } from "@/lib/format";
import { IssueTaxInvoiceButton } from "./issue-button";

export const dynamic = "force-dynamic";

type OrgTax = {
  name?: string;
  tax_name?: string;
  tax_id?: string;
  tax_address?: string;
  tax_branch?: string;
};

export default async function OwnerTaxInvoices() {
  await requirePerm("payments");
  const admin = createAdminClient();
  const { data: pays } = await admin
    .from("subscription_payments")
    .select("*, organizations(name, tax_name, tax_id, tax_address, tax_branch)")
    .eq("status", "verified")
    .order("verified_at", { ascending: false });

  const list = pays ?? [];
  const issued = list.filter((p) => p.tax_invoice_no);
  const notIssued = list.filter((p) => !p.tax_invoice_no);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">ใบกำกับภาษี</h1>
      <p className="mt-1 text-sm text-slate-500">
        ออกใบกำกับภาษี/ใบเสร็จให้สมาชิก จากรายการที่ยืนยันการชำระแล้ว
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="ยืนยันแล้วทั้งหมด" value={String(list.length)} />
        <StatCard label="ออกใบกำกับภาษีแล้ว" value={String(issued.length)} accent="emerald" />
        <StatCard label="ยังไม่ออก" value={String(notIssued.length)} accent="amber" />
      </div>

      <div className="mt-6 card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">วันที่ชำระ</th>
                <th className="px-4 py-3 font-medium">สมาชิก</th>
                <th className="px-4 py-3 font-medium">แพ็คเกจ/รอบ</th>
                <th className="px-4 py-3 text-right font-medium">จำนวน</th>
                <th className="px-4 py-3 font-medium">เลขที่ใบกำกับภาษี</th>
                <th className="px-4 py-3 text-right font-medium">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    ยังไม่มีรายการที่ยืนยันการชำระ
                  </td>
                </tr>
              )}
              {list.map((p) => {
                const org = (p.organizations as OrgTax | null) ?? {};
                const hasTaxInfo = Boolean(org.tax_name && org.tax_id);
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600">{formatDate(p.paid_at)}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{org.name ?? "-"}</p>
                      {!hasTaxInfo && (
                        <p className="text-xs text-amber-600">⚠ สมาชิกยังไม่กรอกข้อมูลผู้เสียภาษี</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {packageBySlug(p.package_slug)?.name ?? p.package_slug} ·{" "}
                      {p.cycle === "yearly" ? "รายปี" : "รายเดือน"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatBaht(p.amount)}</td>
                    <td className="px-4 py-3">
                      {p.tax_invoice_no ? (
                        <Badge className="bg-emerald-100 text-emerald-700">{p.tax_invoice_no}</Badge>
                      ) : (
                        <span className="text-xs text-slate-400">ยังไม่ออก</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        {p.tax_invoice_no ? (
                          <Link
                            href={`/owner/tax-invoices/${p.id}`}
                            className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                          >
                            🧾 ดู/พิมพ์
                          </Link>
                        ) : (
                          <IssueTaxInvoiceButton paymentId={p.id} />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
