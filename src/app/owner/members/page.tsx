import Link from "next/link";
import { requirePerm } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui";
import { Pagination, parsePage } from "@/components/pagination";
import { packageBySlug } from "@/lib/packages";
import {
  formatDate,
  SUBSCRIPTION_STATUS_LABEL,
  SUBSCRIPTION_STATUS_STYLE,
} from "@/lib/format";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

type Row = {
  org_id: string;
  org_name: string;
  created_at: string;
  owner_name: string | null;
  owner_phone: string | null;
  package_slug: string | null;
  status: string;
  expires_at: string | null;
  tenant_count: number;
};

export default async function OwnerMembers({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  await requirePerm("members");
  const { q, status, page: pageRaw } = await searchParams;
  const page = parsePage(pageRaw);
  const admin = createAdminClient();

  let rows: Row[] = [];
  let total = 0;

  // ใช้ RPC (join+กรอง+แบ่งหน้าใน DB)
  const rpc = await admin.rpc("admin_list_members", {
    p_q: q ?? "",
    p_status: status ?? "",
    p_limit: PAGE_SIZE,
    p_offset: (page - 1) * PAGE_SIZE,
  });

  if (!rpc.error && rpc.data) {
    rows = (rpc.data as (Row & { total_count: number })[]).map((r) => ({ ...r }));
    total = (rpc.data as { total_count?: number }[])[0]?.total_count ?? 0;
  } else {
    // fallback (เผื่อ prod ยังไม่ได้รัน 0041) — โหลดแบบจำกัดจำนวน + กรอง/แบ่งหน้าใน JS
    const [{ data: orgs }, { data: subs }, { data: owners }, { data: tenants }] = await Promise.all([
      admin.from("organizations").select("id, name, created_at").order("created_at", { ascending: false }).limit(1000),
      admin.from("subscriptions").select("org_id, package_slug, status, expires_at"),
      admin.from("profiles").select("org_id, full_name, phone").eq("role", "owner"),
      admin.from("tenants").select("org_id"),
    ]);
    const subBy = new Map((subs ?? []).map((s) => [s.org_id, s]));
    const ownerBy = new Map((owners ?? []).map((o) => [o.org_id, o]));
    const tCount = new Map<string, number>();
    (tenants ?? []).forEach((t) => tCount.set(t.org_id, (tCount.get(t.org_id) ?? 0) + 1));
    let all = (orgs ?? []).map((o) => {
      const s = subBy.get(o.id) as { package_slug?: string; status?: string; expires_at?: string } | undefined;
      const ow = ownerBy.get(o.id) as { full_name?: string; phone?: string } | undefined;
      return {
        org_id: o.id,
        org_name: o.name,
        created_at: o.created_at,
        owner_name: ow?.full_name ?? null,
        owner_phone: ow?.phone ?? null,
        package_slug: s?.package_slug ?? null,
        status: s?.status ?? "expired",
        expires_at: s?.expires_at ?? null,
        tenant_count: tCount.get(o.id) ?? 0,
      } as Row;
    });
    if (q) {
      const kw = q.toLowerCase();
      all = all.filter(
        (r) =>
          r.org_name.toLowerCase().includes(kw) ||
          (r.owner_name ?? "").toLowerCase().includes(kw) ||
          (r.owner_phone ?? "").includes(kw)
      );
    }
    if (status) all = all.filter((r) => r.status === status);
    total = all.length;
    rows = all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  }

  const STATUSES = ["", "active", "trialing", "past_due", "expired", "cancelled"];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">สมาชิก</h1>
      <p className="mt-1 text-sm text-slate-500">ลูกค้าที่ใช้งาน Chao-Dee ทั้งหมด ({total.toLocaleString()})</p>

      <form className="mt-5 flex flex-wrap gap-2" action="/owner/members">
        <input name="q" defaultValue={q} placeholder="ค้นหาชื่อหอ / เจ้าของ / เบอร์…" className="field max-w-xs" />
        <select name="status" defaultValue={status ?? ""} className="field w-auto">
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === "" ? "ทุกสถานะ" : SUBSCRIPTION_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <button className="btn-secondary" type="submit">ค้นหา</button>
      </form>

      <div className="mt-5 card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">กิจการ</th>
                <th className="px-4 py-3 font-medium">เจ้าของ</th>
                <th className="px-4 py-3 font-medium">แพ็คเกจ</th>
                <th className="px-4 py-3 font-medium">สถานะ</th>
                <th className="px-4 py-3 font-medium">หมดอายุ</th>
                <th className="px-4 py-3 font-medium">ผู้เช่า</th>
                <th className="px-4 py-3 font-medium">สมัครเมื่อ</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-400">ไม่พบสมาชิก</td>
                </tr>
              )}
              {rows.map((o) => {
                const st = o.status ?? "expired";
                return (
                  <tr key={o.org_id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{o.org_name}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {o.owner_name || "-"}
                      {o.owner_phone && <span className="block text-xs text-slate-400">{o.owner_phone}</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{packageBySlug(o.package_slug ?? "")?.name ?? "-"}</td>
                    <td className="px-4 py-3">
                      <Badge className={SUBSCRIPTION_STATUS_STYLE[st]}>{SUBSCRIPTION_STATUS_LABEL[st]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{o.expires_at ? formatDate(o.expires_at) : "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{Number(o.tenant_count) || 0}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(o.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/owner/members/${o.org_id}`} className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
                        เปิด →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination basePath="/owner/members" page={page} pageSize={PAGE_SIZE} total={total} params={{ q, status }} />
      </div>
    </div>
  );
}
