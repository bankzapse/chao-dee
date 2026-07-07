import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui";
import { DeleteButton } from "@/components/action-form";
import type { Tenant } from "@/lib/types";
import { AddTenantButton, EditTenantButton } from "./tenant-buttons";
import { TenantDocsButton } from "./tenant-docs";
import { LineLinkCell } from "./line-link";
import { deleteTenant } from "./actions";

const NO_ROOM = "— ยังไม่ได้เข้าพัก —";

export default async function TenantsPage() {
  const supabase = await createClient();
  const [{ data }, { data: docs }, { data: contracts }] = await Promise.all([
    supabase.from("tenants").select("*").order("full_name"),
    supabase.from("tenant_documents").select("tenant_id"),
    supabase
      .from("contracts")
      .select("tenant_id, rooms(room_number, buildings(name))")
      .eq("status", "active"),
  ]);

  const list = (data ?? []) as Tenant[];
  const docCount = new Map<string, number>();
  (docs ?? []).forEach((d: { tenant_id: string }) => {
    docCount.set(d.tenant_id, (docCount.get(d.tenant_id) ?? 0) + 1);
  });

  // แผนที่ ผู้เช่า → อาคาร/ห้อง (จากสัญญาที่ยัง active)
  const placement = new Map<string, { building: string; room: string }>();
  (contracts ?? []).forEach((c: { tenant_id: string; rooms: unknown }) => {
    const r = c.rooms as { room_number: string; buildings: { name: string } | null } | null;
    if (r) placement.set(c.tenant_id, { building: r.buildings?.name ?? "-", room: r.room_number });
  });

  // จัดกลุ่มผู้เช่าตามอาคาร
  const byBuilding = new Map<string, Tenant[]>();
  for (const t of list) {
    const b = placement.get(t.id)?.building ?? NO_ROOM;
    if (!byBuilding.has(b)) byBuilding.set(b, []);
    byBuilding.get(b)!.push(t);
  }
  // เรียงอาคารตามชื่อ, กลุ่ม "ยังไม่ได้เข้าพัก" ไว้ท้ายสุด
  const buildings = [...byBuilding.keys()].sort((a, b) => {
    if (a === NO_ROOM) return 1;
    if (b === NO_ROOM) return -1;
    return a.localeCompare(b, "th");
  });

  return (
    <div>
      <PageHeader
        title="ผู้เช่า"
        subtitle="จัดกลุ่มตามอาคาร · แสดงห้องที่พักอยู่"
        action={<AddTenantButton />}
      />

      {list.length === 0 ? (
        <EmptyState
          title="ยังไม่มีผู้เช่า"
          description="เพิ่มผู้เช่าเพื่อผูกกับสัญญาเช่า"
          action={<AddTenantButton />}
        />
      ) : (
        <div className="space-y-6">
          {buildings.map((building) => (
            <section key={building} className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  🏢 {building}
                </h2>
                <span className="text-xs text-slate-400">{byBuilding.get(building)!.length} คน</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-100 text-left text-slate-400">
                    <tr>
                      <th className="px-4 py-2 font-medium">ชื่อ</th>
                      <th className="px-4 py-2 font-medium">ห้อง</th>
                      <th className="px-4 py-2 font-medium">เบอร์โทร</th>
                      <th className="px-4 py-2 font-medium">LINE</th>
                      <th className="px-4 py-2 text-right font-medium">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {byBuilding.get(building)!.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">👤 {t.full_name}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {placement.get(t.id) ? (
                            <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                              ห้อง {placement.get(t.id)!.room}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{t.phone || "-"}</td>
                        <td className="px-4 py-3">
                          <LineLinkCell
                            tenantId={t.id}
                            linked={Boolean(t.line_user_id)}
                            code={t.line_link_code || ""}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-3">
                            <TenantDocsButton tenantId={t.id} count={docCount.get(t.id) ?? 0} />
                            <EditTenantButton tenant={t} />
                            <DeleteButton
                              action={deleteTenant.bind(null, t.id)}
                              confirmText={`ลบผู้เช่า "${t.full_name}"?`}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
