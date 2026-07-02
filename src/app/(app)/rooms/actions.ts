"use server";

import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/components/action-form";
import type { RoomStatus } from "@/lib/types";

function parseRoom(formData: FormData) {
  return {
    building_id: String(formData.get("building_id") ?? ""),
    room_number: String(formData.get("room_number") ?? "").trim(),
    floor: Number(formData.get("floor") ?? 1),
    size_sqm: Number(formData.get("size_sqm") ?? 0),
    base_rent: Number(formData.get("base_rent") ?? 0),
    water_rate: Number(formData.get("water_rate") ?? 0),
    electricity_rate: Number(formData.get("electricity_rate") ?? 0),
    status: (String(formData.get("status") ?? "vacant") as RoomStatus),
    note: String(formData.get("note") ?? "").trim(),
  };
}

export async function createRoom(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const data = parseRoom(formData);
  if (!data.building_id) return { error: "กรุณาเลือกอาคาร" };
  if (!data.room_number) return { error: "กรุณาระบุเลขห้อง" };

  const supabase = await createClient();
  const { error } = await supabase.from("rooms").insert(data);
  if (error) {
    if (error.code === "23505") return { error: "เลขห้องนี้มีอยู่แล้วในอาคารนี้" };
    return { error: error.message };
  }
  return { ok: true };
}

export async function updateRoom(
  id: string,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const data = parseRoom(formData);
  if (!data.room_number) return { error: "กรุณาระบุเลขห้อง" };

  const supabase = await createClient();
  const { error } = await supabase.from("rooms").update(data).eq("id", id);
  if (error) {
    if (error.code === "23505") return { error: "เลขห้องนี้มีอยู่แล้วในอาคารนี้" };
    return { error: error.message };
  }
  return { ok: true };
}

export async function deleteRoom(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("rooms").delete().eq("id", id);
}
