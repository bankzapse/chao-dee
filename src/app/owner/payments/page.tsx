import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { StatCard, Badge } from "@/components/ui";
import { packageBySlug } from "@/lib/packages";
import { formatBaht, formatDate, PAYMENT_METHOD_LABEL } from "@/lib/format";
import type { PaymentMethod } from "@/lib/types";
import { VerifyPaymentButton, RejectPaymentButton } from "../member-actions";

export default async function OwnerPayments() {
  const admin = createAdminClient();
  const { data: pays } = await admin
    .from("subscription_payments")
    .select("*, organizations(name)")
    .order("created_at", { ascending: false });

  const list = pays ?? [];
  const pending = list.filter((p) => p.status === "pending");
  const verified = list.filter((p) => p.status === "verified");
  const pendingAmount = pending.reduce((s, p) => s + Number(p.amount), 0);
  const verifiedAmount = verified.reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">การชำระเงิน</h1>
      <p className="mt-1 text-sm text-slate-500">ยืนยันการชำระเพื่อเปิดสิทธิ์/ต่ออายุให้สมาชิก</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="รอยืนยัน" value={String(pending.length)} hint={formatBaht(pendingAmount)} accent="amber" />
        <StatCard label="ยืนยันแล้ว" value={String(verified.length)} accent="emerald" />
        <StatCard label="รายรับรวม (ยืนยันแล้ว)" value={formatBaht(verifiedAmount)} accent="emerald" />
      </div>

      <div className="mt-6 card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">วันที่</th>
                <th className="px-4 py-3 font-medium">สมาชิก</th>
                <th className="px-4 py-3 font-medium">แพ็คเกจ/รอบ</th>
                <th className="px-4 py-3 font-medium">ช่องทาง</th>
                <th className="px-4 py-3 text-right font-medium">จำนวน</th>
                <th className="px-4 py-3 font-medium">สถานะ</th>
                <th className="px-4 py-3 text-right font-medium">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    ยังไม่มีรายการชำระเงิน
                  </td>
                </tr>
              )}
              {list.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">{formatDate(p.paid_at)}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    <Link href={`/owner/members/${p.org_id}`} className="hover:text-indigo-600">
                      {(p.organizations as { name?: string } | null)?.name ?? "-"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {packageBySlug(p.package_slug)?.name ?? p.package_slug} · {p.cycle === "yearly" ? "รายปี" : "รายเดือน"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{PAYMENT_METHOD_LABEL[p.method as PaymentMethod]}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatBaht(p.amount)}</td>
                  <td className="px-4 py-3">
                    <Badge
                      className={
                        p.status === "verified"
                          ? "bg-emerald-100 text-emerald-700"
                          : p.status === "rejected"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-amber-100 text-amber-700"
                      }
                    >
                      {p.status === "verified" ? "ยืนยันแล้ว" : p.status === "rejected" ? "ปฏิเสธ" : "รอยืนยัน"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      {p.status === "pending" && (
                        <>
                          <VerifyPaymentButton paymentId={p.id} />
                          <RejectPaymentButton paymentId={p.id} />
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
