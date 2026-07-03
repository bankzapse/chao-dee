import { requirePlatformAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader, StatCard, Badge } from "@/components/ui";
import {
  formatDate,
  formatBaht,
  SUBSCRIPTION_STATUS_LABEL,
  SUBSCRIPTION_STATUS_STYLE,
} from "@/lib/format";
import { packageBySlug } from "@/lib/packages";
import { EditSubButton, type SubEdit } from "./member-row";

export default async function MembersPage() {
  await requirePlatformAdmin();
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

  const list = orgs ?? [];
  const activeCount = (subs ?? []).filter((s) => s.status === "active").length;
  const trialCount = (subs ?? []).filter((s) => s.status === "trialing").length;
  const mrr = (subs ?? [])
    .filter((s) => s.status === "active")
    .reduce((sum, s) => sum + Number(s.price) / (s.cycle === "yearly" ? 12 : 1), 0);

  return (
    <div>
      <PageHeader
        title="สมาชิก & แพ็คเกจ"
        subtitle="จัดการลูกค้าที่ใช้งาน ChaoDee (สำหรับทีมแพลตฟอร์ม)"
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <StatCard label="สมาชิกทั้งหมด" value={String(list.length)} accent="indigo" />
        <StatCard label="ใช้งานอยู่ (active)" value={String(activeCount)} accent="emerald" />
        <StatCard label="ทดลองใช้ (trial)" value={String(trialCount)} accent="slate" />
        <StatCard label="รายได้/เดือน (MRR)" value={formatBaht(mrr)} accent="emerald" />
      </div>

      <div className="card overflow-hidden">
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
                <th className="px-4 py-3 text-right font-medium">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map((o) => {
                const s = subByOrg.get(o.id);
                const owner = ownerByOrg.get(o.id) as { full_name: string; phone: string } | undefined;
                const pkg = s ? packageBySlug(s.package_slug) : undefined;
                const status = s?.status ?? "expired";
                const edit: SubEdit = {
                  orgId: o.id,
                  orgName: o.name,
                  package_slug: s?.package_slug ?? "pro",
                  cycle: s?.cycle ?? "monthly",
                  status,
                  price: s?.price ?? 0,
                  expires_at: s?.expires_at ?? null,
                  note: s?.note ?? "",
                };
                return (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{o.name}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {owner?.full_name || "-"}
                      {owner?.phone && <span className="block text-xs text-slate-400">{owner.phone}</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{pkg?.name ?? s?.package_slug ?? "-"}</td>
                    <td className="px-4 py-3">
                      <Badge className={SUBSCRIPTION_STATUS_STYLE[status]}>
                        {SUBSCRIPTION_STATUS_LABEL[status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {s?.expires_at ? formatDate(s.expires_at) : "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{tenantCount.get(o.id) ?? 0}</td>
                    <td className="px-4 py-3 text-right">
                      <EditSubButton sub={edit} />
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
