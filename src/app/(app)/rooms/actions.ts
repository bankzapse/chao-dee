"use server";

import { createClient } from "@/lib/supabase/server";
import { checkLimit } from "@/lib/limits";
import { money, intMin, intClamp } from "@/lib/num";
import type { FormState } from "@/components/action-form";
import type { RoomStatus } from "@/lib/types";

/** true ถ้า error เกิดจากคอลัมน์ยังไม่มี (ยังไม่ได้รัน migration 0020) */
function isMissingColumn(msg?: string): boolean {
  return Boolean(msg && /schema cache|could not find the .* column/i.test(msg));
}
export type RoomFeeRow = { id: string; parking_fee: number; garbage_fee: number };

/** บันทึกค่าจอดรถ/ค่าขยะ หลายห้องพร้อมกัน (RLS จำกัดให้แก้ได้เฉพาะห้องของกิจการตัวเอง) */
export async function saveRoomFees(rows: RoomFeeRow[]): Promise<FormState> {
  if (!rows.length) return { ok: true };
  const supabase = await createClient();
  const results = await Promise.all(
    rows.map((r) =>
      supabase
        .from("rooms")
        .update({ parking_fee: money(r.parking_fee), garbage_fee: money(r.garbage_fee) })
        .eq("id", r.id)
    )
  );
  const bad = results.find((r) => r.error);
  if (bad?.error) {
    if (isMissingColumn(bad.error.message)) {
      return { error: "ยังไม่ได้อัปเดตฐานข้อมูล (migration 0043) — กรุณารัน migration ก่อน" };
    }
    return { error: bad.error.message };
  }
  return { ok: true };
}

/** ตัดคอลัมน์ของ migration 0020 ออก (เผื่อ prod ยังไม่ได้รัน) */
function stripNewCols<T extends Record<string, unknown>>(row: T) {
  const rest = { ...row };
  delete rest.water_mode;
  delete rest.water_flat_per_person;
  delete rest.parking_fee;
  delete rest.garbage_fee;
  return rest;
}

function parseRoom(formData: FormData) {
  const water_mode = String(formData.get("water_mode") ?? "unit") === "flat_person" ? "flat_person" : "unit";
  return {
    building_id: String(formData.get("building_id") ?? ""),
    room_number: String(formData.get("room_number") ?? "").trim(),
    floor: intMin(formData.get("floor"), 0),
    size_sqm: money(formData.get("size_sqm")),
    base_rent: money(formData.get("base_rent")),
    water_mode,
    // เก็บทั้งสองค่าไว้ แต่ใช้ตาม mode ที่เลือก
    water_rate: water_mode === "unit" ? money(formData.get("water_rate")) : 0,
    water_flat_per_person: water_mode === "flat_person" ? money(formData.get("water_flat_per_person")) : 0,
    electricity_rate: money(formData.get("electricity_rate")),
    parking_fee: money(formData.get("parking_fee")),
    garbage_fee: money(formData.get("garbage_fee")),
    status: (String(formData.get("status") ?? "vacant") as RoomStatus),
    note: String(formData.get("note") ?? "").trim(),
  };
}

export async function createRoom(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const data = parseRoom(formData);
  if (!data.building_id) return { error: "กรุณาเลือกอาคาร", values: data };
  if (!data.room_number) return { error: "กรุณาระบุเลขห้อง", values: data };

  const limit = await checkLimit("rooms");
  if (limit) return { ...limit, values: data };

  const supabase = await createClient();
  let { error } = await supabase.from("rooms").insert(data);
  if (isMissingColumn(error?.message)) {
    ({ error } = await supabase.from("rooms").insert(stripNewCols(data)));
  }
  if (error) {
    if (error.code === "23505") return { error: "เลขห้องนี้มีอยู่แล้วในอาคารนี้", values: data };
    return { error: error.message, values: data };
  }
  return { ok: true };
}

/** เพิ่มหลายห้องพร้อมกัน — สร้างเลขห้องอัตโนมัติ (prefix + running number) */
export async function createRoomsBulk(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const building_id = String(formData.get("building_id") ?? "");
  const floor = intMin(formData.get("floor"), 0);
  const prefix = String(formData.get("prefix") ?? "").trim();
  const start = intMin(formData.get("start"), 0);
  const count = intClamp(formData.get("count"), 0, 200);
  const base_rent = money(formData.get("base_rent"));
  const water_rate = money(formData.get("water_rate"));
  const electricity_rate = money(formData.get("electricity_rate"));

  const values = { building_id, floor, prefix, start, count, base_rent, water_rate, electricity_rate };
  if (!building_id) return { error: "กรุณาเลือกอาคาร", values };
  if (!Number.isFinite(count) || count < 1 || count > 200)
    return { error: "จำนวนห้องต้องอยู่ระหว่าง 1–200", values };

  const limit = await checkLimit("rooms", count);
  if (limit) return { ...limit, values };

  const rows = Array.from({ length: count }, (_, i) => ({
    building_id,
    room_number: `${prefix}${start + i}`,
    floor,
    size_sqm: 0,
    base_rent,
    water_mode: "unit",
    water_rate,
    water_flat_per_person: 0,
    electricity_rate,
    status: "vacant" as RoomStatus,
    note: "",
  }));

  const supabase = await createClient();
  let { error } = await supabase.from("rooms").insert(rows);
  if (isMissingColumn(error?.message)) {
    ({ error } = await supabase.from("rooms").insert(rows.map(stripNewCols)));
  }
  if (error) {
    if (error.code === "23505")
      return { error: "มีเลขห้องซ้ำกับที่มีอยู่แล้วในอาคารนี้ — ลองเปลี่ยนเลขเริ่มต้น/prefix", values };
    return { error: error.message, values };
  }
  return { ok: true };
}

export async function updateRoom(
  id: string,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const data = parseRoom(formData);
  if (!data.room_number) return { error: "กรุณาระบุเลขห้อง", values: data };

  const supabase = await createClient();
  let { error } = await supabase.from("rooms").update(data).eq("id", id);
  if (isMissingColumn(error?.message)) {
    ({ error } = await supabase.from("rooms").update(stripNewCols(data)).eq("id", id));
  }
  if (error) {
    if (error.code === "23505") return { error: "เลขห้องนี้มีอยู่แล้วในอาคารนี้", values: data };
    return { error: error.message, values: data };
  }
  return { ok: true };
}

export async function deleteRoom(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("rooms").delete().eq("id", id);
}
