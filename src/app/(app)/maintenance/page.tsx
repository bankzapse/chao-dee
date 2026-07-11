import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui";
import { DeleteButton } from "@/components/action-form";
import { formatDate, MAINTENANCE_STATUS_LABEL, MAINTENANCE_STATUS_STYLE } from "@/lib/format";
import type { MaintenanceRequest, MaintenanceStatus, Tenant } from "@/lib/types";
import {
  AddMaintenanceButton,
  StatusSelect,
  type RoomOpt,
} from "./maintenance-ui";
import { deleteMaintenance } from "./actions";

type Row = MaintenanceRequest & {
  rooms: { room_number: string; buildings: { name: string } | null } | null;
  tenants: { full_name: string } | null;
};

const NO_ROOM = "— ไม่ระบุห้อง —";

const ACCENT: Record<MaintenanceStatus, { bar: string; chip: string }> = {
  open: { bar: "border-l-rose-400", chip: "bg-rose-100 text-rose-600" },
  in_progress: { bar: "border-l-amber-400", chip: "bg-amber-100 text-amber-600" },
  done: { bar: "border-l-emerald-400", chip: "bg-emerald-100 text-emerald-600" },
  cancelled: { bar: "border-l-slate-300", chip: "bg-slate-100 text-slate-400" },
};

export default async function MaintenancePage() {
  const supabase = await createClient();
  const [{ data: reqs }, { data: rooms }, { data: tenants }] = await Promise.all([
    supabase
      .from("maintenance_requests")
      .select("*, rooms(room_number, buildings(name)), tenants(full_name)")
      .order("created_at", { ascending: false }),
    supabase.from("rooms").select("id, room_number, buildings(name)").order("room_number"),
    supabase.from("tenants").select("*").order("full_name"),
  ]);

  const list = (reqs ?? []) as unknown as Row[];
  const roomOpts: RoomOpt[] = (rooms ?? []).map((r) => {
    const b = r.buildings as unknown as { name: string } | null;
    return { id: r.id, label: `${b?.name ?? "-"} · ${r.room_number}` };
  });

  // แบ่งตามอาคาร + เรียงห้องจากน้อยไปมาก (ในห้องเดียวกันคงล่าสุดก่อน)
  const byBuilding = new Map<string, Row[]>();
  for (const m of list) {
    const b = m.rooms?.buildings?.name ?? NO_ROOM;
    if (!byBuilding.has(b)) byBuilding.set(b, []);
    byBuilding.get(b)!.push(m);
  }
  for (const arr of byBuilding.values()) {
    arr.sort((a, b) =>
      (a.rooms?.room_number ?? "").localeCompare(b.rooms?.room_number ?? "", undefined, { numeric: true })
    );
  }
  const buildings = [...byBuilding.keys()].sort((a, b) => {
    if (a === NO_ROOM) return 1;
    if (b === NO_ROOM) return -1;
    return a.localeCompare(b, "th");
  });

  const count = (s: MaintenanceStatus) => list.filter((m) => m.status === s).length;
  const summary = [
    { label: "ทั้งหมด", value: list.length, icon: "🧰", cls: "from-slate-500 to-slate-600" },
    { label: "รอดำเนินการ", value: count("open"), icon: "⏳", cls: "from-rose-500 to-rose-600" },
    { label: "กำลังซ่อม", value: count("in_progress"), icon: "🔧", cls: "from-amber-500 to-orange-500" },
    { label: "เสร็จแล้ว", value: count("done"), icon: "✅", cls: "from-emerald-500 to-teal-500" },
  ];

  return (
    <div className="animate-in">
      <PageHeader
        title="แจ้งซ่อม"
        subtitle="ติดตามและจัดการงานซ่อมบำรุง"
        action={<AddMaintenanceButton rooms={roomOpts} tenants={(tenants ?? []) as Tenant[]} />}
      />

      {/* การ์ดสรุปสถานะ */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {summary.map((s) => (
          <div key={s.label} className="card flex items-center gap-3 p-4">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${s.cls} text-lg shadow-sm`}>
              {s.icon}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs text-slate-500">{s.label}</p>
              <p className="text-xl font-bold text-slate-900">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState
          title="ยังไม่มีงานแจ้งซ่อม 🎉"
          description="ผู้เช่าแจ้งซ่อมผ่าน LINE ได้เลย หรือเพิ่มเองที่นี่"
          action={<AddMaintenanceButton rooms={roomOpts} tenants={(tenants ?? []) as Tenant[]} />}
        />
      ) : (
        <div className="space-y-6">
          {buildings.map((building) => (
            <section key={building}>
              <div className="mb-2 flex items-center gap-2 px-1">
                <h2 className="text-sm font-semibold text-slate-700">🏢 {building}</h2>
                <span className="text-xs text-slate-400">{byBuilding.get(building)!.length} รายการ</span>
              </div>
              <div className="space-y-3">
                {byBuilding.get(building)!.map((m) => {
                  const a = ACCENT[m.status];
                  return (
                    <div key={m.id} className={`card card-hover border-l-4 ${a.bar} p-5`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${a.chip}`}>
                      🔧
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-slate-900">{m.title}</h3>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${MAINTENANCE_STATUS_STYLE[m.status]}`}>
                          {MAINTENANCE_STATUS_LABEL[m.status]}
                        </span>
                        {m.source === "line" && (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                            💬 LINE
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {m.rooms?.room_number ? `🚪 ห้อง ${m.rooms.room_number}` : "ไม่ระบุห้อง"}
                        {m.tenants?.full_name ? ` · ${m.tenants.full_name}` : ""} · {formatDate(m.created_at)}
                      </p>
                      {m.description && (
                        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{m.description}</p>
                      )}
                    </div>
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
                    );
                  })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
