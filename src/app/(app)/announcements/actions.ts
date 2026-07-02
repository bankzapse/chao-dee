"use server";

import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/auth";
import { pushMessage, textMessage, isLineConfigured } from "@/lib/line";
import type { FormState } from "@/components/action-form";

export async function createAnnouncement(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "กรุณาระบุหัวข้อ" };

  const supabase = await createClient();
  const org_id = await getOrgId();
  const { error } = await supabase.from("announcements").insert({
    org_id,
    title,
    body: String(formData.get("body") ?? "").trim(),
  });
  if (error) return { error: error.message };
  return { ok: true };
}

/** ส่งประกาศไปยังผู้เช่าที่ผูก LINE แล้วทุกคนในองค์กร */
export async function sendAnnouncement(
  id: string
): Promise<{ ok?: boolean; error?: string; count?: number }> {
  if (!isLineConfigured()) {
    return { error: "ยังไม่ได้ตั้งค่า LINE (ตั้งค่า LINE_CHANNEL_ACCESS_TOKEN ใน .env.local)" };
  }

  const supabase = await createClient();
  const { data: ann } = await supabase
    .from("announcements")
    .select("title, body")
    .eq("id", id)
    .single();
  if (!ann) return { error: "ไม่พบประกาศ" };

  const { data: tenants } = await supabase
    .from("tenants")
    .select("line_user_id")
    .neq("line_user_id", "");

  const targets = (tenants ?? []).map((t) => t.line_user_id).filter(Boolean);
  const message = textMessage(`📢 ${ann.title}\n\n${ann.body}`);

  let count = 0;
  for (const uid of targets) {
    const res = await pushMessage(uid, [message]);
    if (res.ok) count++;
  }

  await supabase
    .from("announcements")
    .update({ sent_at: new Date().toISOString(), recipients: count })
    .eq("id", id);

  return { ok: true, count };
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("announcements").delete().eq("id", id);
}
