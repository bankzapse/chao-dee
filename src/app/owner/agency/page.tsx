import Link from "next/link";
import { requirePerm } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { StatCard, Badge } from "@/components/ui";
import { formatBaht, formatDate } from "@/lib/format";
import { DEAL_STATUS_LABEL, DEAL_STATUS_STYLE, type DealStatus } from "@/lib/agency";
import {
  CreateDealButton,
  AdvanceButton,
  MarkSignedButton,
  IssueInvoiceButton,
  ConfirmPaidButton,
  CancelDealButton,
  RequestStatusButton,
} from "./deal-buttons";

export const dynamic = "force-dynamic";

type Deal = {
  id: string;
  org_id: string;
  lead_id: string | null;
  status: DealStatus;
  lead_name: string;
  lead_phone: string;
  rent_base: number;
  commission_amount: number;
  slip_path: string;
  created_at: string;
  organizations: { name?: string } | { name?: string }[] | null;
};

export default async function OwnerAgencyPage() {
  await requirePerm("agency");
  const admin = createAdminClient();

  const dealsRes = await admin
    .from("agency_deals")
    .select("*, organizations(name)")
    .order("created_at", { ascending: false })
    .limit(300);

  if (dealsRes.error) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-slate-900">ดีลนายหน้า</h1>
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ยังไม่ได้อัปเดตฐานข้อมูล — กรุณารัน migration <b>0044_agency_deals.sql</b> ก่อนใช้งาน
        </p>
      </div>
    );
  }

  const deals = (dealsRes.data ?? []) as unknown as Deal[];
  const dealLeadIds = new Set(deals.map((d) => d.lead_id).filter(Boolean));

  // lead ที่ยังไม่ได้สร้างดีล (เฉพาะหอที่เปิดใช้บริการนายหน้า)
  const { data: orgsOn } = await admin
    .from("organizations")
    .select("id, name")
    .eq("agency_enabled", true);
  const orgOnIds = ((orgsOn ?? []) as { id: string; name: string }[]).map((o) => o.id);
  const orgName = new Map(((orgsOn ?? []) as { id: string; name: string }[]).map((o) => [o.id, o.name]));

  const { data: leadRows } = orgOnIds.length
    ? await admin
        .from("listing_leads")
        .select("id, org_id, name, phone, created_at")
        .in("org_id", orgOnIds)
        .order("created_at", { ascending: false })
        .limit(50)
    : { data: [] };
  const newLeads = ((leadRows ?? []) as { id: string; org_id: string; name: string; phone: string; created_at: string }[])
    .filter((l) => !dealLeadIds.has(l.id));

  // คำขอ "ให้เราหาห้องให้" ที่ยังไม่ปิด (resilient เผื่อยังไม่ได้รัน 0045)
  const reqRes = await admin
    .from("agency_requests")
    .select("id, name, phone, province, district, budget_min, budget_max, occupants, move_in, note, status")
    .neq("status", "closed")
    .order("created_at", { ascending: false })
    .limit(50);
  const openRequests = (reqRes.error ? [] : (reqRes.data ?? [])) as unknown as {
    id: string;
    name: string;
    phone: string;
    province: string;
    district: string;
    budget_min: number;
    budget_max: number;
    occupants: number;
    move_in: string | null;
    note: string;
    status: string;
  }[];

  const openDeals = deals.filter((d) => !["paid", "cancelled"].includes(d.status));
  const pendingCash = deals
    .filter((d) => d.status === "invoiced")
    .reduce((s, d) => s + Number(d.commission_amount), 0);
  const earned = deals
    .filter((d) => d.status === "paid")
    .reduce((s, d) => s + Number(d.commission_amount), 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">ดีลนายหน้า</h1>
      <p className="mt-1 text-sm text-slate-500">
        จัดหาผู้เช่าให้เจ้าของหอ · ค่านายหน้า 1 เดือนเมื่อปิดดีลสำเร็จ
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="ดีลกำลังดำเนินการ" value={String(openDeals.length)} />
        <StatCard label="ค่านายหน้ารอเก็บ" value={formatBaht(pendingCash)} accent="amber" />
        <StatCard label="รายได้ค่านายหน้า (เก็บแล้ว)" value={formatBaht(earned)} accent="emerald" />
      </div>

      {/* lead ที่ยังไม่ได้สร้างดีล */}
      {newLeads.length > 0 && (
        <div className="mt-6 card overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5">
            <h2 className="text-sm font-semibold text-slate-700">
              ผู้สนใจเช่าที่ยังไม่ได้สร้างดีล ({newLeads.length})
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {newLeads.map((l) => (
              <div key={l.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <span className="font-medium text-slate-900">{l.name || "-"}</span>
                  <span className="ml-2 text-slate-500">{l.phone}</span>
                  <span className="ml-2 text-xs text-slate-400">
                    · {orgName.get(l.org_id) ?? "-"} · {formatDate(l.created_at)}
                  </span>
                </div>
                <CreateDealButton leadId={l.id} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* คำขอ "ให้เราหาห้องให้" จากผู้เช่า */}
      {openRequests.length > 0 && (
        <div className="mt-6 card overflow-hidden">
          <div className="border-b border-slate-200 bg-amber-50 px-4 py-2.5">
            <h2 className="text-sm font-semibold text-amber-900">
              ✦ คำขอ “ให้เราหาห้องให้” ({openRequests.length})
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {openRequests.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <span className="font-medium text-slate-900">{r.name || "-"}</span>
                  <span className="ml-2 text-slate-500">{r.phone}</span>
                  <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                    {r.status === "new" ? "ใหม่" : r.status === "contacted" ? "ติดต่อแล้ว" : "จับคู่แล้ว"}
                  </span>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {[r.province, r.district].filter(Boolean).join(" · ") || "ไม่ระบุทำเล"}
                    {Number(r.budget_max) > 0
                      ? ` · งบ ${formatBaht(Number(r.budget_min))}–${formatBaht(Number(r.budget_max))}`
                      : ""}
                    {` · ${r.occupants} คน`}
                    {r.move_in ? ` · เข้าอยู่ ${formatDate(r.move_in)}` : ""}
                  </p>
                  {r.note && <p className="mt-0.5 text-xs text-slate-500">“{r.note}”</p>}
                </div>
                <div className="flex items-center gap-3">
                  {r.status === "new" && <RequestStatusButton requestId={r.id} to="contacted" label="ติดต่อแล้ว" />}
                  {r.status !== "matched" && <RequestStatusButton requestId={r.id} to="matched" label="จับคู่ได้" />}
                  <RequestStatusButton requestId={r.id} to="closed" label="ปิด" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ตารางดีล */}
      <div className="mt-6 card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">วันที่</th>
                <th className="px-4 py-3 font-medium">หอ / เจ้าของ</th>
                <th className="px-4 py-3 font-medium">ผู้สนใจเช่า</th>
                <th className="px-4 py-3 font-medium">สถานะ</th>
                <th className="px-4 py-3 text-right font-medium">ค่าเช่า</th>
                <th className="px-4 py-3 text-right font-medium">ค่านายหน้า</th>
                <th className="px-4 py-3 text-right font-medium">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {deals.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    ยังไม่มีดีลนายหน้า
                  </td>
                </tr>
              )}
              {deals.map((d) => {
                const org = Array.isArray(d.organizations) ? d.organizations[0] : d.organizations;
                return (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500">{formatDate(d.created_at)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/owner/members/${d.org_id}`} className="font-medium text-slate-900 hover:text-indigo-600">
                        {org?.name ?? "-"}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-900">{d.lead_name || "-"}</p>
                      {d.lead_phone && <p className="text-xs text-slate-400">{d.lead_phone}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={DEAL_STATUS_STYLE[d.status]}>{DEAL_STATUS_LABEL[d.status]}</Badge>
                      {d.status === "invoiced" && d.slip_path && (
                        <span className="ml-1 text-xs text-emerald-600">· มีสลิป</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {Number(d.rent_base) > 0 ? formatBaht(d.rent_base) : "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {Number(d.commission_amount) > 0 ? formatBaht(d.commission_amount) : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-3">
                        {d.status === "new" && <AdvanceButton dealId={d.id} to="contacted" label="ติดต่อแล้ว" />}
                        {d.status === "contacted" && <AdvanceButton dealId={d.id} to="viewing" label="นัดดูห้อง" />}
                        {(d.status === "viewing" || d.status === "contacted") && <MarkSignedButton dealId={d.id} />}
                        {d.status === "signed" && <IssueInvoiceButton dealId={d.id} />}
                        {d.status === "invoiced" && <ConfirmPaidButton dealId={d.id} />}
                        {!["paid", "cancelled"].includes(d.status) && <CancelDealButton dealId={d.id} />}
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
