import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui";
import { DeleteButton } from "@/components/action-form";
import { formatDate } from "@/lib/format";
import type { MaintenanceRequest, Tenant } from "@/lib/types";
import {
  AddMaintenanceButton,
  StatusSelect,
  type RoomOpt,
} from "./maintenance-ui";
import { deleteMaintenance } from "./actions";

type Row = MaintenanceRequest & {
  rooms: { room_number: string } | null;
  tenants: { full_name: string } | null;
};

export default async function MaintenancePage() {
  const supabase = await createClient();
  const [{ data: reqs }, { data: rooms }, { data: tenants }] = await Promise.all([
    supabase
      .from("maintenance_requests")
      .select("*, rooms(room_number), tenants(full_name)")
      .order("created_at", { ascending: false }),
    supabase.from("rooms").select("id, room_number, buildings(name)").order("room_number"),
    supabase.from("tenants").select("*").order("full_name"),
  ]);

  const list = (reqs ?? []) as unknown as Row[];
  const roomOpts: RoomOpt[] = (rooms ?? []).map((r) => {
    const b = r.buildings as unknown as { name: string } | null;
    return { id: r.id, label: `${b?.name ?? "-"} · ${r.room_number}` };
  });

  return (
    <div>
      <PageHeader
        title="แจ้งซ่อม"
        subtitle="ติดตามและจัดการงานซ่อมบำรุง"
        action={<AddMaintenanceButton rooms={roomOpts} tenants={(tenants ?? []) as Tenant[]} />}
      />

      {list.length === 0 ? (
        <EmptyState
          title="ยังไม่มีงานแจ้งซ่อม"
          description="ผู้เช่าแจ้งซ่อมผ่าน LINE ได้ หรือเพิ่มเองที่นี่"
          action={<AddMaintenanceButton rooms={roomOpts} tenants={(tenants ?? []) as Tenant[]} />}
        />
      ) : (
        <div className="space-y-3">
          {list.map((m) => (
            <div key={m.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900">🔧 {m.title}</h3>
                    {m.source === "line" && (
                      <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-700">
                        LINE
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {m.rooms?.room_number ? `ห้อง ${m.rooms.room_number}` : "ไม่ระบุห้อง"}
                    {m.tenants?.full_name ? ` · ${m.tenants.full_name}` : ""} ·{" "}
                    {formatDate(m.created_at)}
                  </p>
                  {m.description && (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                      {m.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <StatusSelect id={m.id} value={m.status} />
                  <DeleteButton
                    action={deleteMaintenance.bind(null, m.id)}
                    confirmText="ลบงานแจ้งซ่อมนี้?"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
