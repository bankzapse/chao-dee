"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/auth";
import { lineToken, isLineConfigured } from "@/lib/line";

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
  // เก็บ userId เดิมไว้ เพื่อคืน rich menu เป็น default (เมนูผู้เช่า) ก่อนล้าง
  const { data: org } = await supabase
    .from("organizations")
    .select("owner_line_user_id")
    .eq("id", orgId)
    .maybeSingle();
  const uid = (org as { owner_line_user_id?: string } | null)?.owner_line_user_id ?? "";

  await supabase
    .from("organizations")
    .update({ line_link_code: "", owner_line_user_id: "" })
    .eq("id", orgId);

  if (uid && isLineConfigured()) {
    try {
      await fetch(`https://api.line.me/v2/bot/user/${uid}/richmenu`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${lineToken()}` },
      });
    } catch {
      /* best-effort — คืนเมนูไม่สำเร็จก็ไม่เป็นไร */
    }
  }
  revalidatePath("/settings");
}
