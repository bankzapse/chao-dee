"use server";

import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/auth";
import type { FormState } from "@/components/action-form";
import type { VehicleType } from "@/lib/types";

function parse(formData: FormData) {
  return {
    plate: String(formData.get("plate") ?? "").trim(),
    vehicle_type: String(formData.get("vehicle_type") ?? "car") as VehicleType,
    brand: String(formData.get("brand") ?? "").trim(),
    color: String(formData.get("color") ?? "").trim(),
    sticker_no: String(formData.get("sticker_no") ?? "").trim(),
    room_id: String(formData.get("room_id") ?? "") || null,
    tenant_id: String(formData.get("tenant_id") ?? "") || null,
    note: String(formData.get("note") ?? "").trim(),
  };
}

export async function createVehicle(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const data = parse(formData);
  if (!data.plate) return { error: "กรุณาระบุทะเบียนรถ" };
  const supabase = await createClient();
  const org_id = await getOrgId();
  const { error } = await supabase.from("vehicles").insert({ org_id, ...data });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function updateVehicle(
  id: string,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const data = parse(formData);
  if (!data.plate) return { error: "กรุณาระบุทะเบียนรถ" };
  const supabase = await createClient();
  const { error } = await supabase.from("vehicles").update(data).eq("id", id);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function deleteVehicle(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("vehicles").delete().eq("id", id);
}
