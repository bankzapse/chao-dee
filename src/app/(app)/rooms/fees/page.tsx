import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui";
import { FeesForm, type FeeRoom } from "./fees-form";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  room_number: string;
  floor: number | null;
  parking_fee?: number;
  garbage_fee?: number;
  buildings: { name: string } | { name: string }[] | null;
};

export default async function RoomFeesPage() {
  const supabase = await createClient();

  // resilient: ถ้ายังไม่ได้รัน 0043 (garbage_fee) ให้ถอยไป select แบบไม่มีคอลัมน์นั้น
  let res = await supabase
    .from("rooms")
    .select("id, room_number, floor, parking_fee, garbage_fee, buildings(name)")
    .order("floor")
    .order("room_number");
  if (res.error && /schema cache|could not find the .* column/i.test(res.error.message)) {
    res = (await supabase
      .from("rooms")
      .select("id, room_number, floor, parking_fee, buildings(name)")
      .order("floor")
      .order("room_number")) as typeof res;
  }

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
  // เรียงตามอาคาร → เลขห้อง
  rooms.sort(
    (a, b) =>
      a.building_name.localeCompare(b.building_name, "th") ||
      a.room_number.localeCompare(b.room_number, undefined, { numeric: true })
  );

  // โหมดค่าขยะของกิจการ (resilient)
  const { data: gbRow } = await supabase
    .from("organizations")
    .select("garbage_mode, garbage_flat")
    .maybeSingle();
  const gb = gbRow as { garbage_mode?: string; garbage_flat?: number } | null;

  return (
    <div>
      <PageHeader
        title="ค่าจอดรถ / ค่าขยะ รายห้อง"
        subtitle="ตั้งค่าบริการรายเดือนของแต่ละห้อง — ห้องที่ไม่เก็บให้ใส่ 0 (ระบบจะรวมเข้าบิลอัตโนมัติ)"
        action={
          <Link href="/rooms" className="btn-secondary">
            ← กลับห้องพัก
          </Link>
        }
      />

      {rooms.length === 0 ? (
        <EmptyState title="ยังไม่มีห้องพัก" description="เพิ่มห้องพักก่อน จึงจะตั้งค่าจอดรถ/ค่าขยะได้" />
      ) : (
        <FeesForm
          rooms={rooms}
          garbageFlatMode={gb?.garbage_mode === "flat"}
          garbageFlat={Number(gb?.garbage_flat ?? 0)}
        />
      )}
    </div>
  );
}
