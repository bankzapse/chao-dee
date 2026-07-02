"use server";

import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/auth";
import type { FormState } from "@/components/action-form";

function parse(formData: FormData) {
  return {
    full_name: String(formData.get("full_name") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    id_card: String(formData.get("id_card") ?? "").trim(),
    note: String(formData.get("note") ?? "").trim(),
  };
}

export async function createTenant(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const data = parse(formData);
  if (!data.full_name) return { error: "กรุณาระบุชื่อผู้เช่า" };

  const supabase = await createClient();
  const org_id = await getOrgId();
  const { error } = await supabase.from("tenants").insert({ org_id, ...data });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function updateTenant(
  id: string,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const data = parse(formData);
  if (!data.full_name) return { error: "กรุณาระบุชื่อผู้เช่า" };

  const supabase = await createClient();
  const { error } = await supabase.from("tenants").update(data).eq("id", id);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function deleteTenant(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("tenants").delete().eq("id", id);
}

/** สร้างรหัสเชื่อมบัญชี LINE 6 หลักให้ผู้เช่า แล้วคืนรหัสไปแสดง */
export async function generateLinkCode(id: string): Promise<{ code?: string; error?: string }> {
  const code = crypto.randomBytes(3).toString("hex").toUpperCase(); // 6 hex chars
  const supabase = await createClient();
  const { error } = await supabase
    .from("tenants")
    .update({ line_link_code: code, line_user_id: "" })
    .eq("id", id);
  if (error) return { error: error.message };
  return { code };
}

export async function unlinkLine(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("tenants").update({ line_user_id: "", line_link_code: "" }).eq("id", id);
}
