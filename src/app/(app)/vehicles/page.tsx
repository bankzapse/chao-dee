import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState, Badge } from "@/components/ui";
import { DeleteButton } from "@/components/action-form";
import { VEHICLE_TYPE_LABEL } from "@/lib/format";
import type { Vehicle, VehicleType, Tenant } from "@/lib/types";
import {
  AddVehicleButton,
  EditVehicleButton,
  type RoomOpt,
} from "./vehicle-buttons";
import { deleteVehicle } from "./actions";

type Row = Vehicle & {
  rooms: { room_number: string } | null;
  tenants: { full_name: string } | null;
};

export default async function VehiclesPage() {
  const supabase = await createClient();
  const [{ data: vehicles }, { data: rooms }, { data: tenants }] = await Promise.all([
    supabase
      .from("vehicles")
      .select("*, rooms(room_number), tenants(full_name)")
      .order("created_at", { ascending: false }),
    supabase.from("rooms").select("id, room_number, buildings(name)").order("room_number"),
    supabase.from("tenants").select("*").order("full_name"),
  ]);

  const list = (vehicles ?? []) as unknown as Row[];
  const roomOpts: RoomOpt[] = (rooms ?? []).map((r) => {
    const b = r.buildings as unknown as { name: string } | null;
    return { id: r.id, label: `${b?.name ?? "-"} · ${r.room_number}` };
  });
  const tenantList = (tenants ?? []) as Tenant[];

  return (
    <div>
      <PageHeader
        title="ยานพาหนะ"
        subtitle="ทะเบียนรถของผู้เช่าและสติกเกอร์จอด"
        action={<AddVehicleButton rooms={roomOpts} tenants={tenantList} />}
      />

      {list.length === 0 ? (
        <EmptyState
          title="ยังไม่มีข้อมูลยานพาหนะ"
          action={<AddVehicleButton rooms={roomOpts} tenants={tenantList} />}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">ทะเบียน</th>
                  <th className="px-4 py-3 font-medium">ประเภท</th>
                  <th className="px-4 py-3 font-medium">รถ</th>
                  <th className="px-4 py-3 font-medium">ห้อง / ผู้เช่า</th>
                  <th className="px-4 py-3 font-medium">สติกเกอร์</th>
                  <th className="px-4 py-3 text-right font-medium">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">🚗 {v.plate}</td>
                    <td className="px-4 py-3">
                      <Badge className="bg-slate-100 text-slate-600">
                        {VEHICLE_TYPE_LABEL[v.vehicle_type as VehicleType]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {[v.brand, v.color].filter(Boolean).join(" · ") || "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {v.rooms?.room_number ? `ห้อง ${v.rooms.room_number}` : "-"}
                      {v.tenants?.full_name && (
                        <span className="ml-1 text-slate-400">{v.tenants.full_name}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{v.sticker_no || "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <EditVehicleButton vehicle={v} rooms={roomOpts} tenants={tenantList} />
                        <DeleteButton
                          action={deleteVehicle.bind(null, v.id)}
                          confirmText={`ลบทะเบียน ${v.plate}?`}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
