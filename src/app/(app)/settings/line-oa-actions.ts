"use server";

import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/auth";
import type { FormState } from "@/components/action-form";

function isMissingColumn(msg?: string): boolean {
  return Boolean(msg && /schema cache|could not find the .* column/i.test(msg));
}

/** บันทึก LINE OA @id ของเจ้าของหอ (normalize ให้ขึ้นต้นด้วย @) */
export async function saveLineOa(_prev: FormState, formData: FormData): Promise<FormState> {
  let id = String(formData.get("line_oa_id") ?? "").trim();
  if (id && !id.startsWith("@")) id = "@" + id;

  const supabase = await createClient();
  const org_id = await getOrgId();
  const { error } = await supabase.from("organizations").update({ line_oa_id: id }).eq("id", org_id);
  if (error) {
    if (isMissingColumn(error.message))
      return { error: "ระบบยังไม่พร้อม (ผู้ดูแลต้องรัน migration 0032)" };
    return { error: error.message };
  }
  return { ok: true };
}
