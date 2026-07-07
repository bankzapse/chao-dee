"use server";

import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/auth";
import { checkLimit } from "@/lib/limits";
import type { FormState } from "@/components/action-form";

/** true ถ้า error เกิดจากคอลัมน์ยังไม่มี (ยังไม่ได้รัน migration) */
function isMissingColumn(msg?: string): boolean {
  return Boolean(msg && /schema cache|could not find the .* column/i.test(msg));
}

export async function createBuilding(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "กรุณาระบุชื่ออาคาร" };

  const limit = await checkLimit("buildings");
  if (limit) return limit;

  const supabase = await createClient();
  const org_id = await getOrgId();
  const base = {
    org_id,
    name,
    address: String(formData.get("address") ?? "").trim(),
    note: String(formData.get("note") ?? "").trim(),
  };
  const floors = Math.max(1, Number(formData.get("floors") ?? 1));

  let { error } = await supabase.from("buildings").insert({ ...base, floors });
  // ถ้ายังไม่มีคอลัมน์ floors (ยังไม่ได้รัน migration) → บันทึกโดยไม่มี floors ไปก่อน
  if (isMissingColumn(error?.message)) {
    ({ error } = await supabase.from("buildings").insert(base));
  }
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
  const base = {
    name,
    address: String(formData.get("address") ?? "").trim(),
    note: String(formData.get("note") ?? "").trim(),
  };
  const floors = Math.max(1, Number(formData.get("floors") ?? 1));

  let { error } = await supabase.from("buildings").update({ ...base, floors }).eq("id", id);
  if (isMissingColumn(error?.message)) {
    ({ error } = await supabase.from("buildings").update(base).eq("id", id));
  }
  if (error) return { error: error.message };
  return { ok: true };
}

export async function deleteBuilding(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("buildings").delete().eq("id", id);
}
