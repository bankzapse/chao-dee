import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { StatCard, Badge } from "@/components/ui";
import { packageBySlug } from "@/lib/packages";
import {
  formatBaht,
  formatDate,
  PAYMENT_METHOD_LABEL,
  SUBSCRIPTION_STATUS_LABEL,
  SUBSCRIPTION_STATUS_STYLE,
} from "@/lib/format";
import type { PaymentMethod } from "@/lib/types";
import {
  RecordPaymentButton,
  ManageSubButton,
  VerifyPaymentButton,
  RejectPaymentButton,
  SetStatusButton,
} from "../../member-actions";

export default async function MemberDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();

  const [{ data: org }, { data: sub }, { data: owner }, { data: pays }, { data: buildings }, { data: tenants }] =
    await Promise.all([
      admin.from("organizations").select("*").eq("id", id).single(),
      admin.from("subscriptions").select("*").eq("org_id", id).maybeSingle(),
      admin.from("profiles").select("full_name, phone").eq("org_id", id).eq("role", "owner").maybeSingle(),
      admin.from("subscription_payments").select("*").eq("org_id", id).order("created_at", { ascending: false }),
      admin.from("buildings").select("id").eq("org_id", id),
      admin.from("tenants").select("id").eq("org_id", id),
    ]);

  if (!org) notFound();
  const st = sub?.status ?? "expired";
  const pkg = packageBySlug(sub?.package_slug ?? "");
  const paymentList = pays ?? [];

  return (
    <div>
      <Link href="/owner/members" className="text-sm text-slate-500 hover:text-slate-700">
        ← กลับรายชื่อสมาชิก
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{org.name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            เจ้าของ: {owner?.full_name || "-"} {owner?.phone && `· ${owner.phone}`} · สมัครเมื่อ {formatDate(org.created_at)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {st === "cancelled" ? (
            <SetStatusButton orgId={id} to="active" />
          ) : (
            <SetStatusButton orgId={id} to="cancelled" />
          )}
          <ManageSubButton
            sub={{
              orgId: id,
              package_slug: sub?.package_slug ?? "pro",
              cycle: sub?.cycle ?? "monthly",
              status: st,
              price: sub?.price ?? 0,
              expires_at: sub?.expires_at ?? null,
              note: sub?.note ?? "",
            }}
          />
          <RecordPaymentButton orgId={id} defaultSlug={sub?.package_slug} />
        </div>
      </div>

      {/* subscription + usage */}
      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <div className="card p-5">
          <p className="text-sm text-slate-500">แพ็คเกจ</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{pkg?.name ?? sub?.package_slug ?? "-"}</p>
          <Badge className={`mt-2 ${SUBSCRIPTION_STATUS_STYLE[st]}`}>{SUBSCRIPTION_STATUS_LABEL[st]}</Badge>
        </div>
        <div className="card p-5">
          <p className="text-sm text-slate-500">รอบ / ราคา</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{formatBaht(sub?.price ?? 0)}</p>
          <p className="text-xs text-slate-400">{sub?.cycle === "yearly" ? "รายปี" : "รายเดือน"}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-slate-500">หมดอายุ</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{sub?.expires_at ? formatDate(sub.expires_at) : "-"}</p>
        </div>
        <StatCard label="การใช้งาน" value={`${(tenants ?? []).length} ผู้เช่า`} hint={`${(buildings ?? []).length} อาคาร`} accent="slate" />
      </div>

      {/* payment history */}
      <h2 className="mb-3 mt-8 text-lg font-semibold text-slate-900">ประวัติการชำระเงิน</h2>
      {paymentList.length === 0 ? (
        <div className="card p-6 text-sm text-slate-500">ยังไม่มีการชำระเงิน — กด “บันทึกการชำระ” เพื่อเพิ่ม</div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">วันที่</th>
                  <th className="px-4 py-3 font-medium">แพ็คเกจ/รอบ</th>
                  <th className="px-4 py-3 font-medium">ช่องทาง</th>
                  <th className="px-4 py-3 text-right font-medium">จำนวน</th>
                  <th className="px-4 py-3 font-medium">สถานะ</th>
                  <th className="px-4 py-3 text-right font-medium">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paymentList.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600">{formatDate(p.paid_at)}</td>
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
      )}
    </div>
  );
}
