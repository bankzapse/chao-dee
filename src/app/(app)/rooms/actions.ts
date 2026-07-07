"use server";

import { createClient } from "@/lib/supabase/server";
import { checkLimit } from "@/lib/limits";
import type { FormState } from "@/components/action-form";
import type { RoomStatus } from "@/lib/types";

/** true ถ้า error เกิดจากคอลัมน์ยังไม่มี (ยังไม่ได้รัน migration 0020) */
function isMissingColumn(msg?: string): boolean {
  return Boolean(msg && /schema cache|could not find the .* column/i.test(msg));
}
/** ตัดคอลัมน์ของ migration 0020 ออก (เผื่อ prod ยังไม่ได้รัน) */
function stripNewCols<T extends Record<string, unknown>>(row: T) {
  const rest = { ...row };
  delete rest.water_mode;
  delete rest.water_flat_per_person;
  delete rest.parking_fee;
  return rest;
}

function parseRoom(formData: FormData) {
  const water_mode = String(formData.get("water_mode") ?? "unit") === "flat_person" ? "flat_person" : "unit";
  return {
    building_id: String(formData.get("building_id") ?? ""),
    room_number: String(formData.get("room_number") ?? "").trim(),
    floor: Number(formData.get("floor") ?? 1),
    size_sqm: Number(formData.get("size_sqm") ?? 0),
    base_rent: Number(formData.get("base_rent") ?? 0),
    water_mode,
    // เก็บทั้งสองค่าไว้ แต่ใช้ตาม mode ที่เลือก
    water_rate: water_mode === "unit" ? Number(formData.get("water_rate") ?? 0) : 0,
    water_flat_per_person:
      water_mode === "flat_person" ? Number(formData.get("water_flat_per_person") ?? 0) : 0,
    electricity_rate: Number(formData.get("electricity_rate") ?? 0),
    parking_fee: Number(formData.get("parking_fee") ?? 0),
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
  const floor = Number(formData.get("floor") ?? 1);
  const prefix = String(formData.get("prefix") ?? "").trim();
  const start = Number(formData.get("start") ?? 1);
  const count = Number(formData.get("count") ?? 0);
  const base_rent = Number(formData.get("base_rent") ?? 0);
  const water_rate = Number(formData.get("water_rate") ?? 0);
  const electricity_rate = Number(formData.get("electricity_rate") ?? 0);

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
