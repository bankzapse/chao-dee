"use server";

import { revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import type { FormState } from "@/components/action-form";

export async function createPromo(_prev: FormState, formData: FormData): Promise<FormState> {
  const adminId = await requirePlatformAdmin();
  const admin = createAdminClient();

  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  if (!code) return { error: "กรุณากรอกโค้ด" };
  const kind = String(formData.get("kind") ?? "percent");
  const value = Number(formData.get("value") ?? 0);
  if (value <= 0) return { error: "มูลค่าส่วนลดต้องมากกว่า 0" };
  if (kind === "percent" && value > 100) return { error: "เปอร์เซ็นต์ต้องไม่เกิน 100" };

  const expires = String(formData.get("expires_at") ?? "").trim();
  const maxUses = String(formData.get("max_uses") ?? "").trim();

  const { error } = await admin.from("promo_codes").insert({
    code,
    description: String(formData.get("description") ?? "").trim(),
    percent_off: kind === "percent" ? value : null,
    amount_off: kind === "amount" ? value : null,
    expires_at: expires || null,
    max_uses: maxUses ? Number(maxUses) : null,
  });
  if (error) {
    if (error.code === "23505") return { error: "โค้ดนี้มีอยู่แล้ว" };
    return { error: error.message };
  }
  await logAudit({ actor_id: adminId, action: "สร้างคูปองส่วนลด", target: code });
  revalidatePath("/owner/promos");
  return { ok: true };
}

export async function togglePromo(id: string, active: boolean): Promise<void> {
  await requirePlatformAdmin();
  const admin = createAdminClient();
  await admin.from("promo_codes").update({ active }).eq("id", id);
  revalidatePath("/owner/promos");
}

export async function deletePromo(id: string): Promise<void> {
  await requirePlatformAdmin();
  const admin = createAdminClient();
  await admin.from("promo_codes").delete().eq("id", id);
  revalidatePath("/owner/promos");
}
