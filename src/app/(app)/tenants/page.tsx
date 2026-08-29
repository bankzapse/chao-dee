import { User } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireModuleView } from "@/lib/access";
import { PageHeader, EmptyState } from "@/components/ui";
import { FilterChip } from "@/components/nav";
import { DeleteButton } from "@/components/action-form";
import type { Tenant, Building } from "@/lib/types";
import { AddTenantButton, EditTenantButton, type RoomOpt } from "./tenant-buttons";
import { TenantDocsButton } from "./tenant-docs";
import { LineLinkCell } from "./line-link";
import { deleteTenant } from "./actions";

const NONE = "none"; // แถบ "ยังไม่เข้าพัก"

export default async function TenantsPage({
  searchParams,
}: {
  searchParams: Promise<{ building?: string }>;
}) {
  const { building } = await searchParams;
  await requireModuleView("tenants");
  const supabase = await createClient();
  const [{ data }, { data: docs }, { data: contracts }, { data: rooms }, { data: buildings }] =
    await Promise.all([
      supabase.from("tenants").select("*").order("full_name"),
      supabase.from("tenant_documents").select("tenant_id"),
      supabase
        .from("contracts")
        .select("tenant_id, rooms(room_number, building_id, buildings(name))")
        .eq("status", "active"),
      supabase.from("rooms").select("id, room_number, building_id, buildings(name)").order("room_number"),
      supabase.from("buildings").select("*").order("name"),
    ]);

  const list = (data ?? []) as Tenant[];
  const buildingList = (buildings ?? []) as Building[];
  const docCount = new Map<string, number>();
  (docs ?? []).forEach((d: { tenant_id: string }) => {
    docCount.set(d.tenant_id, (docCount.get(d.tenant_id) ?? 0) + 1);
  });

  // ห้องทั้งหมด → ตัวเลือกในฟอร์ม + map id → อาคาร/ห้อง
  type Place = { building_id: string; building: string; room: string };
  const roomMap = new Map<string, Place>();
  const roomOpts: RoomOpt[] = (rooms ?? []).map(
    (r: { id: string; room_number: string; building_id: string; buildings: unknown }) => {
      const b = (r.buildings as { name?: string } | null)?.name ?? "-";
      roomMap.set(r.id, { building_id: r.building_id, building: b, room: r.room_number });
      return { id: r.id, label: `${b} · ${r.room_number}` };
    }
  );

  // ผู้เช่า → ที่พัก: ใช้ห้องที่ผูกกับผู้เช่าโดยตรงก่อน (room_id) แล้วค่อย fallback สัญญา active
  const placement = new Map<string, Place>();
  (contracts ?? []).forEach((c: { tenant_id: string; rooms: unknown }) => {
    const r = c.rooms as { room_number: string; building_id: string; buildings: { name: string } | null } | null;
    if (r) placement.set(c.tenant_id, { building_id: r.building_id, building: r.buildings?.name ?? "-", room: r.room_number });
  });
  for (const t of list) {
    if (t.room_id && roomMap.has(t.room_id)) placement.set(t.id, roomMap.get(t.room_id)!);
  }

  // นับจำนวนต่ออาคาร + ยังไม่เข้าพัก
  const countByB = new Map<string, number>();
  let unplaced = 0;
  for (const t of list) {
    const p = placement.get(t.id);
    if (p) countByB.set(p.building_id, (countByB.get(p.building_id) ?? 0) + 1);
    else unplaced++;
  }

  // อาคารที่เลือก — default อาคารแรก (หรือ "ยังไม่เข้าพัก" ถ้าไม่มีอาคาร)
  const validIds = new Set(buildingList.map((b) => b.id));
  const selected =
    building && (validIds.has(building) || building === NONE)
      ? building
      : buildingList[0]?.id ?? NONE;

  const shown = list.filter((t) => (placement.get(t.id)?.building_id ?? NONE) === selected);
  shown.sort((a, b) => {
    const ra = placement.get(a.id)?.room ?? "";
    const rb = placement.get(b.id)?.room ?? "";
    if (ra && rb) return ra.localeCompare(rb, undefined, { numeric: true });
    if (ra) return -1;
    if (rb) return 1;
    return a.full_name.localeCompare(b.full_name, "th");
  });

  return (
    <div>
      <PageHeader
        title="ผู้เช่า"
        subtitle="เลือกดูทีละอาคาร · แสดงห้องที่พักอยู่"
        action={<AddTenantButton rooms={roomOpts} />}
      />

      {list.length === 0 ? (
        <EmptyState
          title="ยังไม่มีผู้เช่า"
          description="เพิ่มผู้เช่าเพื่อผูกกับสัญญาเช่า"
          action={<AddTenantButton rooms={roomOpts} />}
        />
      ) : (
        <>
          {/* filter อาคาร */}
          <div className="mb-4 flex flex-wrap gap-2">
            {buildingList.map((b) => (
              <FilterChip
                key={b.id}
                href={`/tenants?building=${b.id}`}
                label={`${b.name} (${countByB.get(b.id) ?? 0})`}
                active={selected === b.id}
              />
            ))}
            {unplaced > 0 && (
              <FilterChip
                href={`/tenants?building=${NONE}`}
                label={`ยังไม่เข้าพัก (${unplaced})`}
                active={selected === NONE}
              />
            )}
          </div>

          {shown.length === 0 ? (
            <EmptyState title="ไม่มีผู้เช่าในอาคารนี้" />
          ) : (
            <section className="card overflow-hidden">
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
                    {shown.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">
                          <span className="inline-flex items-center gap-2">
                            <User className="h-4 w-4 text-slate-400" strokeWidth={2} />
                            {t.full_name}
                          </span>
                        </td>
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
                            <EditTenantButton tenant={t} rooms={roomOpts} />
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
          )}
        </>
      )}
    </div>
  );
}
