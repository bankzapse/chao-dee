import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState, Badge } from "@/components/ui";
import { DeleteButton } from "@/components/action-form";
import { formatDate, PARCEL_STATUS_LABEL, PARCEL_STATUS_STYLE } from "@/lib/format";
import type { Parcel, ParcelStatus, Tenant } from "@/lib/types";
import { AddParcelButton, PickUpButton, type RoomOpt } from "./parcel-ui";
import { deleteParcel } from "./actions";

type Row = Parcel & {
  rooms: { room_number: string; buildings: { name: string } | null } | null;
  tenants: { full_name: string } | null;
};

const NO_ROOM = "— ไม่ระบุห้อง —";

export default async function ParcelsPage() {
  const supabase = await createClient();
  const [{ data: parcels }, { data: rooms }, { data: tenants }] = await Promise.all([
    supabase
      .from("parcels")
      .select("*, rooms(room_number, buildings(name)), tenants(full_name)")
      .order("created_at", { ascending: false }),
    supabase.from("rooms").select("id, room_number, buildings(name)").order("room_number"),
    supabase.from("tenants").select("*").order("full_name"),
  ]);

  const list = (parcels ?? []) as unknown as Row[];
  const roomOpts: RoomOpt[] = (rooms ?? []).map((r) => {
    const b = r.buildings as unknown as { name: string } | null;
    return { id: r.id, label: `${b?.name ?? "-"} · ${r.room_number}` };
  });
  const today = new Date().toISOString().slice(0, 10);
  const pending = list.filter((p) => p.status === "pending").length;

  // แบ่งตามอาคาร + เรียงห้องจากน้อยไปมาก (ในห้องเดียวกันคงล่าสุดก่อน)
  const byBuilding = new Map<string, Row[]>();
  for (const p of list) {
    const b = p.rooms?.buildings?.name ?? NO_ROOM;
    if (!byBuilding.has(b)) byBuilding.set(b, []);
    byBuilding.get(b)!.push(p);
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

  return (
    <div>
      <PageHeader
        title="พัสดุ"
        subtitle={`รอรับ ${pending} ชิ้น`}
        action={
          <AddParcelButton rooms={roomOpts} tenants={(tenants ?? []) as Tenant[]} today={today} />
        }
      />

      {list.length === 0 ? (
        <EmptyState
          title="ยังไม่มีพัสดุ"
          description="บันทึกพัสดุเข้าแล้วระบบจะแจ้งผู้เช่าทาง LINE อัตโนมัติ"
          action={
            <AddParcelButton rooms={roomOpts} tenants={(tenants ?? []) as Tenant[]} today={today} />
          }
        />
      ) : (
        <div className="space-y-6">
          {buildings.map((building) => (
            <section key={building} className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700">🏢 {building}</h2>
                <span className="text-xs text-slate-400">{byBuilding.get(building)!.length} ชิ้น</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-100 text-left text-slate-400">
                    <tr>
                      <th className="px-4 py-2 font-medium">ห้อง / ผู้รับ</th>
                      <th className="px-4 py-2 font-medium">รับเข้า</th>
                      <th className="px-4 py-2 font-medium">ขนส่ง</th>
                      <th className="px-4 py-2 font-medium">สถานะ</th>
                      <th className="px-4 py-2 text-right font-medium">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {byBuilding.get(building)!.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <span className="font-medium text-slate-900">
                            {p.rooms?.room_number ? `🚪 ห้อง ${p.rooms.room_number}` : "-"}
                          </span>
                          {p.tenants?.full_name && (
                            <span className="ml-2 text-slate-500">{p.tenants.full_name}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{formatDate(p.received_at)}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {p.carrier || "-"}
                          {p.tracking_no && <span className="ml-1 text-xs text-slate-400">#{p.tracking_no}</span>}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={PARCEL_STATUS_STYLE[p.status as ParcelStatus]}>
                            {PARCEL_STATUS_LABEL[p.status as ParcelStatus]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-3">
                            {p.status === "pending" && <PickUpButton id={p.id} />}
                            <DeleteButton action={deleteParcel.bind(null, p.id)} confirmText="ลบรายการพัสดุนี้?" />
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
