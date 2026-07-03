import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui";
import { packageBySlug } from "@/lib/packages";
import {
  formatDate,
  SUBSCRIPTION_STATUS_LABEL,
  SUBSCRIPTION_STATUS_STYLE,
} from "@/lib/format";

export default async function OwnerMembers({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;
  const admin = createAdminClient();

  const [{ data: orgs }, { data: subs }, { data: owners }, { data: tenants }] =
    await Promise.all([
      admin.from("organizations").select("id, name, created_at").order("created_at", { ascending: false }),
      admin.from("subscriptions").select("*"),
      admin.from("profiles").select("org_id, full_name, phone").eq("role", "owner"),
      admin.from("tenants").select("org_id"),
    ]);

  const subByOrg = new Map((subs ?? []).map((s) => [s.org_id, s]));
  const ownerByOrg = new Map((owners ?? []).map((o) => [o.org_id, o]));
  const tenantCount = new Map<string, number>();
  (tenants ?? []).forEach((t) => tenantCount.set(t.org_id, (tenantCount.get(t.org_id) ?? 0) + 1));

  let list = orgs ?? [];
  if (q) {
    const kw = q.toLowerCase();
    list = list.filter((o) => {
      const owner = ownerByOrg.get(o.id) as { full_name?: string; phone?: string } | undefined;
      return (
        o.name.toLowerCase().includes(kw) ||
        (owner?.full_name ?? "").toLowerCase().includes(kw) ||
        (owner?.phone ?? "").includes(kw)
      );
    });
  }
  if (status) list = list.filter((o) => (subByOrg.get(o.id)?.status ?? "expired") === status);

  const STATUSES = ["", "active", "trialing", "past_due", "expired", "cancelled"];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">สมาชิก</h1>
      <p className="mt-1 text-sm text-slate-500">ลูกค้าที่ใช้งาน ChaoDee ทั้งหมด ({list.length})</p>

      {/* filter/search */}
      <form className="mt-5 flex flex-wrap gap-2" action="/owner/members">
        <input
          name="q"
          defaultValue={q}
          placeholder="ค้นหาชื่อหอ / เจ้าของ / เบอร์…"
          className="field max-w-xs"
        />
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
              {list.map((o) => {
                const s = subByOrg.get(o.id);
                const owner = ownerByOrg.get(o.id) as { full_name: string; phone: string } | undefined;
                const st = s?.status ?? "expired";
                return (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{o.name}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {owner?.full_name || "-"}
                      {owner?.phone && <span className="block text-xs text-slate-400">{owner.phone}</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{packageBySlug(s?.package_slug ?? "")?.name ?? "-"}</td>
                    <td className="px-4 py-3">
                      <Badge className={SUBSCRIPTION_STATUS_STYLE[st]}>{SUBSCRIPTION_STATUS_LABEL[st]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{s?.expires_at ? formatDate(s.expires_at) : "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{tenantCount.get(o.id) ?? 0}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(o.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/owner/members/${o.id}`} className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
                        เปิด →
                      </Link>
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
