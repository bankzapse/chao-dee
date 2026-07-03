"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/auth";

/** สร้างรหัสเชื่อม LINE ของเจ้าของหอ (ส่งเข้า OA เพื่อผูกบัญชีรับแจ้งเตือน) */
export async function generateOrgLineCode(): Promise<{ code?: string; error?: string }> {
  const code = crypto.randomBytes(3).toString("hex").toUpperCase();
  const supabase = await createClient();
  const orgId = await getOrgId();
  const { error } = await supabase
    .from("organizations")
    .update({ line_link_code: code, owner_line_user_id: "" })
    .eq("id", orgId);
  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { code };
}

/** ยกเลิกการเชื่อม LINE เจ้าของหอ */
export async function unlinkOrgLine(): Promise<void> {
  const supabase = await createClient();
  const orgId = await getOrgId();
  await supabase
    .from("organizations")
    .update({ line_link_code: "", owner_line_user_id: "" })
    .eq("id", orgId);
  revalidatePath("/settings");
}
