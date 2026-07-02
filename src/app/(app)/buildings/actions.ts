"use server";

import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/auth";
import type { FormState } from "@/components/action-form";

export async function createBuilding(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "กรุณาระบุชื่ออาคาร" };

  const supabase = await createClient();
  const org_id = await getOrgId();
  const { error } = await supabase.from("buildings").insert({
    org_id,
    name,
    address: String(formData.get("address") ?? "").trim(),
    note: String(formData.get("note") ?? "").trim(),
  });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function updateBuilding(
  id: string,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "กรุณาระบุชื่ออาคาร" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("buildings")
    .update({
      name,
      address: String(formData.get("address") ?? "").trim(),
      note: String(formData.get("note") ?? "").trim(),
    })
    .eq("id", id);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function deleteBuilding(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("buildings").delete().eq("id", id);
}
