import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { StatCard, Badge } from "@/components/ui";
import { packageBySlug } from "@/lib/packages";
import {
  formatBaht,
  formatDate,
  SUBSCRIPTION_STATUS_LABEL,
  SUBSCRIPTION_STATUS_STYLE,
} from "@/lib/format";
import { requirePerm } from "@/lib/admin";
import { buildingTypeLabel } from "@/lib/signup-options";
import {
  RecordPaymentButton,
  ManageSubButton,
  VerifyPaymentButton,
  RejectPaymentButton,
  SetStatusButton,
  DeleteMemberButton,
} from "../../member-actions";
import { ApprovePromotionButton, RejectPromotionButton } from "../../promotion-actions";

export const dynamic = "force-dynamic";

export default async function MemberDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requirePerm("members");
  const admin = createAdminClient();

  const [{ data: org }, { data: sub }, { data: owner }, { data: pays }, { data: buildings }, { data: tenants }, { data: rooms }, { data: promos }] =
    await Promise.all([
      admin.from("organizations").select("*").eq("id", id).single(),
      admin.from("subscriptions").select("*").eq("org_id", id).maybeSingle(),
      admin.from("profiles").select("full_name, phone, email").eq("org_id", id).eq("role", "owner").maybeSingle(),
      admin.from("subscription_payments").select("*").eq("org_id", id).order("created_at", { ascending: false }),
      admin.from("buildings").select("id").eq("org_id", id),
      admin.from("tenants").select("id").eq("org_id", id),
      admin.from("rooms").select("id, building_id, buildings!inner(org_id)").eq("buildings.org_id", id),
      admin.from("listing_promotions").select("*, property_listings(title)").eq("org_id", id).order("created_at", { ascending: false }),
    ]);

  if (!org) notFound();
  const st = sub?.status ?? "expired";
  const pkg = packageBySlug(sub?.package_slug ?? "");
  const paymentList = pays ?? [];
  const promoList = promos ?? [];

  // รวมประวัติการชำระ 2 ฝั่ง (ค่าสมาชิก + โปรโมท) แยกด้วยคอลัมน์ "ประเภท"
  type PayRow = {
    id: string;
    kind: "subscription" | "promotion";
    date: string;
    label: string;
    amount: number;
    status: string;
    slip_path: string;
  };
  const rows: PayRow[] = [
    ...paymentList.map((p) => ({
      id: p.id,
      kind: "subscription" as const,
      date: p.paid_at || p.created_at,
      label: `${packageBySlug(p.package_slug)?.name ?? p.package_slug} · ${p.cycle === "yearly" ? "รายปี" : "รายเดือน"}`,
      amount: Number(p.amount),
      status: p.status,
      slip_path: p.slip_path ?? "",
    })),
    ...promoList.map((p) => ({
      id: p.id,
      kind: "promotion" as const,
      date: p.created_at,
      label: `โปรโมท ${p.days} วัน · ${(p.property_listings as { title?: string } | null)?.title ?? "ประกาศ"}`,
      amount: Number(p.amount),
      status: p.status,
      slip_path: p.slip_path ?? "",
    })),
  ].sort((a, b) => (a.date < b.date ? 1 : -1));

  // signed URL ของสลิปทุกใบ (bucket 'slips')
  const slipUrls = new Map<string, string>();
  for (const r of rows) {
    if (r.slip_path) {
      const { data: signed } = await admin.storage.from("slips").createSignedUrl(r.slip_path, 60 * 60);
      if (signed?.signedUrl) slipUrls.set(r.id, signed.signedUrl);
    }
  }

  const location = [org.subdistrict, org.district, org.province].filter(Boolean).join(" · ");

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
          <DeleteMemberButton orgId={id} orgName={org.name} />
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
        <StatCard label="การใช้งาน" value={`${(tenants ?? []).length} ผู้เช่า`} hint={`${(buildings ?? []).length} อาคาร · ${(rooms ?? []).length} ห้อง`} accent="slate" />
      </div>

      {/* รายละเอียดเจ้าของหอ / กิจการ (owner ดูข้อมูลทั้งหมดได้) */}
      <h2 className="mb-3 mt-8 text-lg font-semibold text-slate-900">ข้อมูลเจ้าของหอ / กิจการ</h2>
      <div className="card grid gap-x-8 gap-y-4 p-6 sm:grid-cols-2">
        <Detail label="เจ้าของ" value={owner?.full_name || "-"} />
        <Detail label="เบอร์โทร" value={owner?.phone || "-"} />
        <Detail label="อีเมล" value={owner?.email || "-"} />
        <Detail label="ชื่อกิจการ" value={org.name} />
        <Detail label="ประเภทที่พัก" value={org.building_type ? buildingTypeLabel(org.building_type) : "-"} />
        <Detail label="จำนวนห้อง (แจ้งตอนสมัคร)" value={org.room_count || "-"} />
        <Detail label="สถานะกิจการ" value={org.status || "-"} />
        <Detail label="ที่ตั้ง" value={location || "-"} />
        <Detail label="โค้ดโปรตอนสมัคร" value={org.signup_promo || "-"} />
        <Detail label="เลขผู้เสียภาษี" value={org.tax_id || "-"} />
        {org.tax_name && <Detail label="ชื่อผู้เสียภาษี" value={org.tax_name} />}
        {org.tax_address && <Detail label="ที่อยู่ใบกำกับภาษี" value={org.tax_address} />}
        {org.promptpay_id && <Detail label="PromptPay รับเงินผู้เช่า" value={`${org.promptpay_id}${org.promptpay_name ? ` (${org.promptpay_name})` : ""}`} />}
        <Detail label="สมัครเมื่อ" value={formatDate(org.created_at)} />
      </div>

      {/* payment history — รวม 2 ฝั่ง แยกด้วยประเภท */}
      <h2 className="mb-3 mt-8 text-lg font-semibold text-slate-900">ประวัติการชำระเงิน (ทุกประเภท)</h2>
      {rows.length === 0 ? (
        <div className="card p-6 text-sm text-slate-500">ยังไม่มีการชำระเงิน — กด “บันทึกการชำระ” เพื่อเพิ่ม</div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">วันที่</th>
                  <th className="px-4 py-3 font-medium">ประเภท</th>
                  <th className="px-4 py-3 font-medium">รายการ</th>
                  <th className="px-4 py-3 text-right font-medium">จำนวน</th>
                  <th className="px-4 py-3 font-medium">สถานะ</th>
                  <th className="px-4 py-3 text-right font-medium">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => {
                  const isSub = r.kind === "subscription";
                  const paid = isSub ? r.status === "verified" : r.status === "active";
                  const rejected = r.status === "rejected";
                  const pending = r.status === "pending";
                  return (
                    <tr key={`${r.kind}-${r.id}`} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-600">{formatDate(r.date)}</td>
                      <td className="px-4 py-3">
                        <Badge className={isSub ? "bg-indigo-100 text-indigo-700" : "bg-amber-100 text-amber-700"}>
                          {isSub ? "ค่าสมาชิก" : "โปรโมท"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{r.label}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatBaht(r.amount)}</td>
                      <td className="px-4 py-3">
                        <Badge
                          className={
                            paid ? "bg-emerald-100 text-emerald-700" : rejected ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                          }
                        >
                          {paid ? (isSub ? "ยืนยันแล้ว" : "โปรโมทอยู่") : rejected ? "ปฏิเสธ" : isSub ? "รอยืนยัน" : "รออนุมัติ"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-3">
                          {slipUrls.has(r.id) && (
                            <a
                              href={slipUrls.get(r.id)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                            >
                              🧾 ดูสลิป
                            </a>
                          )}
                          {pending && isSub && (
                            <>
                              <VerifyPaymentButton paymentId={r.id} />
                              <RejectPaymentButton paymentId={r.id} />
                            </>
                          )}
                          {pending && !isSub && (
                            <>
                              <ApprovePromotionButton id={r.id} />
                              <RejectPromotionButton id={r.id} />
                            </>
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
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}
