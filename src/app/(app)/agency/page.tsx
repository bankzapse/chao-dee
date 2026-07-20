import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState, Badge, StatCard } from "@/components/ui";
import { formatBaht, formatDate } from "@/lib/format";
import { DEAL_STATUS_LABEL, DEAL_STATUS_STYLE, type DealStatus } from "@/lib/agency";
import { AcceptAgencyCard, DisableAgencyButton, PayCommissionButton } from "./agency-client";

export const dynamic = "force-dynamic";

type Deal = {
  id: string;
  status: DealStatus;
  lead_name: string;
  lead_phone: string;
  rent_base: number;
  commission_amount: number;
  slip_path: string;
  signed_at: string | null;
  invoiced_at: string | null;
  paid_at: string | null;
  created_at: string;
};

export default async function AgencyPage() {
  const supabase = await createClient();

  // สถานะการเปิดใช้บริการ (resilient เผื่อยังไม่ได้รัน 0044)
  const { data: orgRow, error: orgErr } = await supabase
    .from("organizations")
    .select("agency_enabled, agency_agreed_at")
    .maybeSingle();
  const notMigrated = Boolean(orgErr);
  const org = orgRow as { agency_enabled?: boolean; agency_agreed_at?: string } | null;
  const enabled = Boolean(org?.agency_enabled);

  if (notMigrated) {
    return (
      <div>
        <PageHeader title="ดีลนายหน้า" subtitle="บริการช่วยหาผู้เช่าจาก Chao-Dee" />
        <EmptyState
          title="ยังไม่พร้อมใช้งาน"
          description="ระบบยังไม่ได้อัปเดตฐานข้อมูลสำหรับบริการนายหน้า (migration 0044)"
        />
      </div>
    );
  }

  if (!enabled) {
    return (
      <div>
        <PageHeader title="ดีลนายหน้า" subtitle="ให้ Chao-Dee ช่วยหาผู้เช่าให้ห้องว่างของคุณ" />
        <AcceptAgencyCard />
      </div>
    );
  }

  const { data } = await supabase
    .from("agency_deals")
    .select("id, status, lead_name, lead_phone, rent_base, commission_amount, slip_path, signed_at, invoiced_at, paid_at, created_at")
    .order("created_at", { ascending: false });
  const deals = (data ?? []) as unknown as Deal[];

  const open = deals.filter((d) => !["paid", "cancelled"].includes(d.status));
  const owed = deals
    .filter((d) => d.status === "invoiced")
    .reduce((s, d) => s + Number(d.commission_amount), 0);
  const paidTotal = deals
    .filter((d) => d.status === "paid")
    .reduce((s, d) => s + Number(d.commission_amount), 0);

  return (
    <div>
      <PageHeader
        title="ดีลนายหน้า"
        subtitle="ผู้สนใจเช่าที่ Chao-Dee หามาให้ · ค่านายหน้า 1 เดือนเมื่อปิดดีลสำเร็จ"
        action={<DisableAgencyButton />}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="ดีลที่กำลังดำเนินการ" value={String(open.length)} />
        <StatCard label="ค่านายหน้าค้างชำระ" value={formatBaht(owed)} accent={owed > 0 ? "amber" : undefined} />
        <StatCard label="ชำระแล้วทั้งหมด" value={formatBaht(paidTotal)} accent="emerald" />
      </div>

      {deals.length === 0 ? (
        <EmptyState
          title="ยังไม่มีดีล"
          description="เมื่อมีผู้สนใจเช่าจาก Chao-Dee ระบบจะแสดงที่นี่ พร้อมสถานะการติดตาม"
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">วันที่</th>
                  <th className="px-4 py-3 font-medium">ผู้สนใจเช่า</th>
                  <th className="px-4 py-3 font-medium">สถานะ</th>
                  <th className="px-4 py-3 text-right font-medium">ค่าเช่า/เดือน</th>
                  <th className="px-4 py-3 text-right font-medium">ค่านายหน้า</th>
                  <th className="px-4 py-3 text-right font-medium">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deals.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500">{formatDate(d.created_at)}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{d.lead_name || "-"}</p>
                      {d.lead_phone && (
                        <a href={`tel:${d.lead_phone}`} className="text-xs text-indigo-600">
                          {d.lead_phone}
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={DEAL_STATUS_STYLE[d.status]}>{DEAL_STATUS_LABEL[d.status]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {Number(d.rent_base) > 0 ? formatBaht(d.rent_base) : "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {Number(d.commission_amount) > 0 ? formatBaht(d.commission_amount) : "-"}
                    </td>
                    <td className="px-4 py-3">
                      {d.status === "invoiced" ? (
                        d.slip_path ? (
                          <p className="text-right text-xs text-amber-600">ส่งสลิปแล้ว · รอยืนยัน</p>
                        ) : (
                          <PayCommissionButton dealId={d.id} amount={Number(d.commission_amount)} />
                        )
                      ) : d.status === "paid" ? (
                        <div className="text-right">
                          <p className="text-xs text-emerald-600">
                            ✓ ชำระแล้ว {d.paid_at ? formatDate(d.paid_at) : ""}
                          </p>
                          <a
                            href={`/agency/receipt/${d.id}`}
                            className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                          >
                            🧾 ใบเสร็จ
                          </a>
                        </div>
                      ) : (
                        <p className="text-right text-xs text-slate-300">—</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="mt-4 text-xs text-slate-400">
        เงื่อนไขเป็นไปตาม{" "}
        <a href="/agency-terms" target="_blank" className="underline hover:text-slate-600">
          สัญญาแต่งตั้งนายหน้าจัดหาผู้เช่า
        </a>
        {org?.agency_agreed_at ? ` · ยอมรับเมื่อ ${formatDate(org.agency_agreed_at)}` : ""}
      </p>
    </div>
  );
}
