"use server";

import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/auth";
import { pushMessage, textMessage, isLineConfigured } from "@/lib/line";
import type { FormState } from "@/components/action-form";

export async function createParcel(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const received_at = String(formData.get("received_at") ?? "");
  if (!received_at) return { error: "กรุณาระบุวันที่รับเข้า" };

  const supabase = await createClient();
  const org_id = await getOrgId();
  const tenant_id = String(formData.get("tenant_id") ?? "") || null;
  const carrier = String(formData.get("carrier") ?? "").trim();

  const { error } = await supabase.from("parcels").insert({
    org_id,
    room_id: String(formData.get("room_id") ?? "") || null,
    tenant_id,
    recipient: String(formData.get("recipient") ?? "").trim(),
    carrier,
    tracking_no: String(formData.get("tracking_no") ?? "").trim(),
    received_at,
    note: String(formData.get("note") ?? "").trim(),
  });
  if (error) return { error: error.message };

  // แจ้งเตือนผู้เช่าทาง LINE
  if (isLineConfigured() && tenant_id) {
    const { data: tenant } = await supabase
      .from("tenants")
      .select("line_user_id")
      .eq("id", tenant_id)
      .single();
    if (tenant?.line_user_id) {
      await pushMessage(tenant.line_user_id, [
        textMessage(
          `📦 มีพัสดุมาถึงคุณแล้ว!\n${carrier ? `ขนส่ง: ${carrier}\n` : ""}กรุณามารับที่สำนักงานหอพักครับ`
        ),
      ]);
    }
  }
  return { ok: true };
}

export async function markPickedUp(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("parcels")
    .update({ status: "picked_up", picked_up_at: new Date().toISOString().slice(0, 10) })
    .eq("id", id);
}

export async function deleteParcel(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("parcels").delete().eq("id", id);
}
