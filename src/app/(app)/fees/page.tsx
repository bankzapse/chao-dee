import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui";
import type { Building, Vehicle, Tenant } from "@/lib/types";
import type { RoomOpt } from "./vehicle-buttons";
import { FeesForm, type FeeRoom } from "./fees-form";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  room_number: string;
  floor: number | null;
  building_id: string;
  parking_fee?: number;
  garbage_fee?: number;
  buildings: { name: string } | { name: string }[] | null;
};

export default async function FeesPage({
  searchParams,
}: {
  searchParams: Promise<{ building?: string }>;
}) {
  const { building } = await searchParams;
  const supabase = await createClient();

  const { data: buildings } = await supabase.from("buildings").select("*").order("name");
  const buildingList = (buildings ?? []) as Building[];

  // ดูทีละอาคารเสมอ — รวมทุกอาคารไว้หน้าเดียวแล้วสับสน
  // ไม่ได้เลือก (หรือเลือกอาคารที่ไม่มีอยู่) → ใช้อาคารแรก
  const selected = buildingList.find((b) => b.id === building)?.id ?? buildingList[0]?.id ?? "";

  const sel = "id, room_number, floor, building_id, parking_fee, garbage_fee, buildings(name)";
  const selLite = "id, room_number, floor, building_id, parking_fee, buildings(name)";
  const build = (s: string) => {
    let q = supabase.from("rooms").select(s).order("floor").order("room_number");
    if (selected) q = q.eq("building_id", selected);
    return q;
  };
  // resilient: ถ้ายังไม่ได้รัน 0043 (garbage_fee) ให้ถอยไป select แบบไม่มีคอลัมน์นั้น
  let res = await build(sel);
  if (res.error && /schema cache|could not find the .* column/i.test(res.error.message)) {
    res = (await build(selLite)) as typeof res;
  }

  const [{ data: vehicles }, { data: tenants }, { data: allRooms }] = await Promise.all([
    supabase.from("vehicles").select("*"),
    supabase.from("tenants").select("*").order("full_name"),
    supabase.from("rooms").select("id, room_number, buildings(name)").order("room_number"),
  ]);

  const rows = (res.data ?? []) as unknown as Row[];
  const rooms: FeeRoom[] = rows.map((r) => {
    const b = Array.isArray(r.buildings) ? r.buildings[0] : r.buildings;
    return {
      id: r.id,
      room_number: r.room_number,
      building_name: b?.name ?? "-",
      parking_fee: Number(r.parking_fee ?? 0),
      garbage_fee: Number(r.garbage_fee ?? 0),
    };
  });
  rooms.sort(
    (a, b) =>
      a.building_name.localeCompare(b.building_name, "th") ||
      a.room_number.localeCompare(b.room_number, undefined, { numeric: true })
  );

  // รถแยกตามห้อง + รถที่ยังไม่ระบุห้อง (จะได้ไม่หายไปจากระบบ)
  const vehiclesByRoom: Record<string, Vehicle[]> = {};
  const unassigned: Vehicle[] = [];
  ((vehicles ?? []) as unknown as Vehicle[]).forEach((v) => {
    if (!v.room_id) {
      unassigned.push(v);
      return;
    }
    (vehiclesByRoom[v.room_id] ??= []).push(v);
  });

  const roomOpts: RoomOpt[] = ((allRooms ?? []) as unknown as {
    id: string;
    room_number: string;
    buildings: { name: string } | { name: string }[] | null;
  }[]).map((r) => {
    const b = Array.isArray(r.buildings) ? r.buildings[0] : r.buildings;
    return { id: r.id, label: `${b?.name ?? "-"} · ${r.room_number}` };
  });

  // โหมดค่าขยะ (resilient)
  const { data: gbRow } = await supabase
    .from("organizations")
    .select("garbage_mode, garbage_flat")
    .maybeSingle();
  const gb = gbRow as { garbage_mode?: string; garbage_flat?: number } | null;
  const scope = buildingList.find((b) => b.id === selected)?.name ?? "ทุกอาคาร";

  return (
    <div>
      <PageHeader
        title="ค่าจอดรถ / ค่าขยะ"
        subtitle={`${scope} · ตั้งค่าบริการรายเดือนของแต่ละห้อง + จัดการยานพาหนะในห้องเดียวกัน (ไม่เก็บให้ใส่ 0)`}
      />

      {buildingList.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {buildingList.map((b) => (
            <FilterChip
              key={b.id}
              href={`/fees?building=${b.id}`}
              label={b.name}
              active={selected === b.id}
            />
          ))}
        </div>
      )}

      {rooms.length === 0 ? (
        <EmptyState
          title={`ยังไม่มีห้องพักใน${scope}`}
          description="เพิ่มห้องพักก่อน จึงจะตั้งค่าจอดรถ/ค่าขยะได้"
        />
      ) : (
        <FeesForm
          rooms={rooms}
          vehiclesByRoom={vehiclesByRoom}
          unassigned={unassigned}
          roomOpts={roomOpts}
          tenants={(tenants ?? []) as Tenant[]}
          garbageFlatMode={gb?.garbage_mode === "flat"}
          garbageFlat={Number(gb?.garbage_flat ?? 0)}
        />
      )}
    </div>
  );
}

function FilterChip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
        active ? "bg-indigo-600 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {label}
    </Link>
  );
}
