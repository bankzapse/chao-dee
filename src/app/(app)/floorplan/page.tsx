import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui";
import {
  ROOM_STATUS_LABEL,
  ROOM_STATUS_STYLE,
  formatBaht,
} from "@/lib/format";
import type { Building, Room, RoomStatus } from "@/lib/types";

export default async function FloorPlanPage({
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
  const buildingList = (buildings ?? []) as Building[];
  const active = building || buildingList[0]?.id;

  let rooms: Room[] = [];
  if (active) {
    const { data } = await supabase
      .from("rooms")
      .select("*")
      .eq("building_id", active)
      .order("room_number");
    rooms = (data ?? []) as Room[];
  }

  // จัดกลุ่มตามชั้น
  const byFloor = new Map<number, Room[]>();
  rooms.forEach((r) => {
    const arr = byFloor.get(r.floor) ?? [];
    arr.push(r);
    byFloor.set(r.floor, arr);
  });
  const floors = [...byFloor.keys()].sort((a, b) => b - a); // ชั้นสูงอยู่บน

  return (
    <div>
      <PageHeader title="ผังห้อง" subtitle="ภาพรวมสถานะห้องแต่ละชั้น" />

      {buildingList.length === 0 ? (
        <EmptyState title="ยังไม่มีอาคาร" description="เพิ่มอาคารและห้องพักก่อน" />
      ) : (
        <>
          {/* เลือกอาคาร */}
          <div className="mb-4 flex flex-wrap gap-2">
            {buildingList.map((b) => (
              <Link
                key={b.id}
                href={`/floorplan?building=${b.id}`}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  active === b.id
                    ? "bg-indigo-600 text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {b.name}
              </Link>
            ))}
          </div>

          {/* legend */}
          <div className="mb-5 flex flex-wrap gap-3 text-xs">
            {(Object.keys(ROOM_STATUS_LABEL) as RoomStatus[]).map((s) => (
              <span key={s} className="inline-flex items-center gap-1.5">
                <span className={`h-3 w-3 rounded ${ROOM_STATUS_STYLE[s]}`} />
                {ROOM_STATUS_LABEL[s]}
              </span>
            ))}
          </div>

          {rooms.length === 0 ? (
            <EmptyState title="อาคารนี้ยังไม่มีห้องพัก" />
          ) : (
            <div className="space-y-4">
              {floors.map((floor) => (
                <div key={floor} className="card p-4">
                  <p className="mb-3 text-sm font-semibold text-slate-500">
                    ชั้น {floor}
                  </p>
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-8">
                    {byFloor.get(floor)!.map((r) => (
                      <div
                        key={r.id}
                        className={`flex flex-col items-center justify-center rounded-lg p-3 text-center ${
                          ROOM_STATUS_STYLE[r.status as RoomStatus]
                        }`}
                        title={`${ROOM_STATUS_LABEL[r.status as RoomStatus]} · ${formatBaht(
                          r.base_rent
                        )}`}
                      >
                        <span className="text-base font-bold">{r.room_number}</span>
                        <span className="mt-0.5 text-[10px] opacity-80">
                          {ROOM_STATUS_LABEL[r.status as RoomStatus]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
