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
    .order("room_number");
  if (building) query = query.eq("building_id", building);

  const { data: rooms } = await query;
  const list = (rooms ?? []) as unknown as RoomRow[];
  const buildingList = (buildings ?? []) as Building[];

  return (
    <div>
      <PageHeader
        title="ห้องพัก"
        subtitle="จัดการห้องพักได้ไม่จำกัด"
        action={<AddRoomButton buildings={buildingList} defaultBuilding={building} />}
      />

      {buildingList.length === 0 ? (
        <EmptyState
          title="ยังไม่มีอาคาร"
          description="กรุณาเพิ่มอาคารก่อนจึงจะเพิ่มห้องพักได้"
        />
      ) : (
        <>
          {/* filter */}
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
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">ห้อง</th>
                      <th className="px-4 py-3 font-medium">อาคาร</th>
                      <th className="px-4 py-3 font-medium">ชั้น</th>
                      <th className="px-4 py-3 font-medium">ค่าเช่า</th>
                      <th className="px-4 py-3 font-medium">น้ำ/ไฟ</th>
                      <th className="px-4 py-3 font-medium">สถานะ</th>
                      <th className="px-4 py-3 text-right font-medium">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {list.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {r.room_number}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{r.buildings?.name ?? "-"}</td>
                        <td className="px-4 py-3 text-slate-600">{r.floor}</td>
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
