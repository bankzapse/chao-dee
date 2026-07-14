import { requirePerm } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateTime } from "@/lib/format";
import { Pagination, parsePage } from "@/components/pagination";

export const metadata = { title: "บันทึกกิจกรรม" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type Log = {
  id: string;
  org_id: string | null;
  actor_name: string;
  action: string;
  target: string;
  meta: Record<string, unknown>;
  created_at: string;
};

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requirePerm("audit");
  const page = parsePage((await searchParams).page);
  const admin = createAdminClient();

  const { data: logs, count } = await admin
    .from("audit_logs")
    .select("id, org_id, actor_name, action, target, meta, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const rows = (logs ?? []) as Log[];
  const total = count ?? 0;
  const orgIds = [...new Set(rows.map((r) => r.org_id).filter(Boolean))] as string[];
  const orgMap = new Map<string, string>();
  if (orgIds.length) {
    const { data: orgs } = await admin.from("organizations").select("id, name").in("id", orgIds);
    (orgs ?? []).forEach((o) => orgMap.set(o.id, o.name));
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">บันทึกกิจกรรม</h1>
      <p className="mt-1 text-sm text-slate-500">ประวัติการดำเนินการทั้งหมด ({total.toLocaleString()})</p>

      <div className="mt-6 card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-slate-500">
                <th className="px-4 py-3 font-medium">เวลา</th>
                <th className="px-4 py-3 font-medium">ผู้ทำ</th>
                <th className="px-4 py-3 font-medium">การกระทำ</th>
                <th className="px-4 py-3 font-medium">กิจการ</th>
                <th className="px-4 py-3 font-medium">รายละเอียด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">
                    {formatDateTime(l.created_at)}
                  </td>
                  <td className="px-4 py-2.5 text-slate-700">{l.actor_name || "—"}</td>
                  <td className="px-4 py-2.5 font-medium text-slate-900">{l.action}</td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {l.org_id ? (orgMap.get(l.org_id) ?? "—") : "แพลตฟอร์ม"}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-400">
                    {l.target}
                    {l.meta && Object.keys(l.meta).length > 0 && (
                      <span className="ml-1">{JSON.stringify(l.meta)}</span>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                    ยังไม่มีบันทึกกิจกรรม
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination basePath="/owner/audit" page={page} pageSize={PAGE_SIZE} total={total} />
      </div>
    </div>
  );
}
