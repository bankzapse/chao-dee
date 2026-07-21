import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui";
import { PeriodSelect } from "@/components/period-select";
import { currentPeriod, recentPeriods, formatPeriod } from "@/lib/format";
import { MetersForm, type MeterRoom } from "./meters-form";

export default async function MetersPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: periodParam } = await searchParams;
  const period = periodParam || currentPeriod();
  const periods = recentPeriods(12);
  if (!periods.includes(period)) periods.unshift(period);

  const supabase = await createClient();

  const [{ data: rooms }, { data: readings }] = await Promise.all([
    supabase
      .from("rooms")
      .select("id, room_number, building_id, water_rate, water_mode, water_flat_per_person, electricity_rate, buildings(name)")
      .order("room_number"),
    supabase
      .from("meter_readings")
      .select("room_id, period, water_value, electric_value")
      .lte("period", period),
  ]);

  // สร้าง map ค่าปัจจุบัน (period ที่เลือก) + ค่าก่อนหน้า (period ล่าสุดที่ < ที่เลือก)
  const byRoom = new Map<
    string,
    { cur?: { w: number; e: number }; prevList: { p: string; w: number; e: number }[] }
  >();
  (readings ?? []).forEach((r) => {
    const entry = byRoom.get(r.room_id) ?? { prevList: [] };
    if (r.period === period) {
      entry.cur = { w: Number(r.water_value), e: Number(r.electric_value) };
    } else {
      entry.prevList.push({
        p: r.period,
        w: Number(r.water_value),
        e: Number(r.electric_value),
      });
    }
    byRoom.set(r.room_id, entry);
  });

  const meterRooms: MeterRoom[] = (rooms ?? []).map((r) => {
    const b = r.buildings as unknown as { name: string } | null;
    const entry = byRoom.get(r.id);
    const prev = entry?.prevList.sort((a, z) => (a.p < z.p ? 1 : -1))[0];
    return {
      id: r.id,
      room_number: r.room_number,
      building_id: (r as { building_id?: string }).building_id ?? "",
      building_name: b?.name ?? "-",
      water_rate: Number(r.water_rate),
      water_mode: (r.water_mode === "flat_person" ? "flat_person" : "unit") as "unit" | "flat_person",
      water_flat_per_person: Number(r.water_flat_per_person ?? 0),
      electricity_rate: Number(r.electricity_rate),
      prev_water: prev ? prev.w : null,
      prev_electric: prev ? prev.e : null,
      cur_water: entry?.cur ? entry.cur.w : null,
      cur_electric: entry?.cur ? entry.cur.e : null,
    };
  });

  // เรียงตามอาคาร แล้วตามเลขห้องจากน้อยไปมาก (รับรู้ตัวเลข: 2 < 10)
  meterRooms.sort((a, b) => {
    if (a.building_name !== b.building_name) return a.building_name.localeCompare(b.building_name, "th");
    return a.room_number.localeCompare(b.room_number, undefined, { numeric: true });
  });

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <PageHeader
        title="จดมิเตอร์น้ำ-ไฟ"
        subtitle={`รอบเดือน ${formatPeriod(period)}`}
        action={<PeriodSelect periods={periods} value={period} />}
      />

      {meterRooms.length === 0 ? (
        <EmptyState
          title="ยังไม่มีห้องพัก"
          description="เพิ่มห้องพักก่อนจึงจะจดมิเตอร์ได้"
        />
      ) : (
        <MetersForm key={period} rooms={meterRooms} period={period} defaultDate={today} />
      )}
    </div>
  );
}
