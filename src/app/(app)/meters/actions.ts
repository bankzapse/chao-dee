"use server";

import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/auth";
import type { FormState } from "@/components/action-form";

export type MeterRow = {
  room_id: string;
  water_value: number;
  electric_value: number;
};

/** บันทึก/อัปเดตค่ามิเตอร์ของหลายห้องในรอบเดือนเดียว (upsert) */
export async function saveMeterReadings(
  period: string,
  readingDate: string,
  rows: MeterRow[]
): Promise<FormState> {
  if (!period) return { error: "ไม่พบรอบเดือน" };
  const supabase = await createClient();
  const org_id = await getOrgId();

  const payload = rows.map((r) => ({
    org_id,
    room_id: r.room_id,
    period,
    water_value: Number(r.water_value) || 0,
    electric_value: Number(r.electric_value) || 0,
    reading_date: readingDate,
  }));

  if (payload.length === 0) return { ok: true };

  const { error } = await supabase
    .from("meter_readings")
    .upsert(payload, { onConflict: "room_id,period" });

  if (error) return { error: error.message };
  return { ok: true };
}
