import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState, Badge } from "@/components/ui";
import { DeleteButton } from "@/components/action-form";
import { formatBaht, ROOM_STATUS_LABEL, ROOM_STATUS_STYLE } from "@/lib/format";
import type { Building, Room, RoomStatus } from "@/lib/types";
import { AddRoomButton, EditRoomButton } from "./room-buttons";
import { deleteRoom } from "./actions";

type RoomRow = Room & { buildings: { name: string } | null };

export default async function RoomsPage({
  searchParams,
}: {
  searchParams: Promise<{ building?: string }>;
}) {
  const { building } = await searchParams;
  const supabase = await createClient();

  const { data: buildings } = await supabase
    .from("buildings")
    .select("*")
    .order("name");

  let query = supabase
    .from("rooms")
    .select("*, buildings(name)")
    // เรียงตามชั้น → เลขห้อง เพื่อจัดกลุ่มตามชั้น
    .order("floor")
    .order("room_number");
  if (building) query = query.eq("building_id", building);

  const { data: rooms } = await query;
  const list = (rooms ?? []) as unknown as RoomRow[];
  const buildingList = (buildings ?? []) as Building[];

  // จัดกลุ่มห้องตามชั้น (คง order ที่ query มาแล้ว)
  const byFloor = new Map<number, RoomRow[]>();
  for (const r of list) {
    const f = r.floor ?? 1;
    if (!byFloor.has(f)) byFloor.set(f, []);
    byFloor.get(f)!.push(r);
  }
  const floors = [...byFloor.keys()].sort((a, b) => a - b);

  return (
    <div>
      <PageHeader
        title="ห้องพัก"
        subtitle="จัดการห้องพักแยกตามชั้น · แก้ไขเลขห้อง/ชั้นได้"
        action={<AddRoomButton buildings={buildingList} defaultBuilding={building} />}
      />

      {buildingList.length === 0 ? (
        <EmptyState
          title="ยังไม่มีอาคาร"
          description="กรุณาเพิ่มอาคารก่อนจึงจะเพิ่มห้องพักได้"
        />
      ) : (
        <>
          {/* filter อาคาร */}
          <div className="mb-4 flex flex-wrap gap-2">
            <FilterChip href="/rooms" label="ทั้งหมด" active={!building} />
            {buildingList.map((b) => (
              <FilterChip
                key={b.id}
                href={`/rooms?building=${b.id}`}
                label={b.name}
                active={building === b.id}
              />
            ))}
          </div>

          {list.length === 0 ? (
            <EmptyState
              title="ยังไม่มีห้องพัก"
              action={<AddRoomButton buildings={buildingList} defaultBuilding={building} />}
            />
          ) : (
            <div className="space-y-6">
              {floors.map((floor) => {
                const roomsOnFloor = byFloor.get(floor)!;
                return (
                  <section key={floor} className="card overflow-hidden">
                    {/* หัวชั้น */}
                    <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5">
                      <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-100 text-xs font-bold text-indigo-700">
                          {floor}
                        </span>
                        ชั้น {floor}
                      </h2>
                      <span className="text-xs text-slate-400">{roomsOnFloor.length} ห้อง</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b border-slate-100 text-left text-slate-400">
                          <tr>
                            <th className="px-4 py-2 font-medium">ห้อง</th>
                            {!building && <th className="px-4 py-2 font-medium">อาคาร</th>}
                            <th className="px-4 py-2 font-medium">ค่าเช่า</th>
                            <th className="px-4 py-2 font-medium">น้ำ/ไฟ</th>
                            <th className="px-4 py-2 font-medium">สถานะ</th>
                            <th className="px-4 py-2 text-right font-medium">จัดการ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {roomsOnFloor.map((r) => (
                            <tr key={r.id} className="hover:bg-slate-50">
                              <td className="px-4 py-3 font-semibold text-slate-900">{r.room_number}</td>
                              {!building && (
                                <td className="px-4 py-3 text-slate-600">{r.buildings?.name ?? "-"}</td>
                              )}
                              <td className="px-4 py-3 text-slate-900">{formatBaht(r.base_rent)}</td>
                              <td className="px-4 py-3 text-xs text-slate-500">
                                {formatBaht(r.water_rate)} / {formatBaht(r.electricity_rate)}
                              </td>
                              <td className="px-4 py-3">
                                <Badge className={ROOM_STATUS_STYLE[r.status as RoomStatus]}>
                                  {ROOM_STATUS_LABEL[r.status as RoomStatus]}
                                </Badge>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-end gap-3">
                                  <EditRoomButton room={r} buildings={buildingList} />
                                  <DeleteButton
                                    action={deleteRoom.bind(null, r.id)}
                                    confirmText={`ลบห้อง ${r.room_number}?`}
                                  />
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FilterChip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
        active
          ? "bg-indigo-600 text-white"
          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {label}
    </Link>
  );
}
