"use server";

import { requirePlatformAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FormState } from "@/components/action-form";

/** อัปเดตแพ็คเกจ/สถานะ/วันหมดอายุของสมาชิก (platform admin เท่านั้น) */
export async function updateSubscription(
  orgId: string,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requirePlatformAdmin(); // gate

  const admin = createAdminClient();
  const expiresRaw = String(formData.get("expires_at") ?? "").trim();

  const { error } = await admin
    .from("subscriptions")
    .update({
      package_slug: String(formData.get("package_slug") ?? "pro"),
      cycle: String(formData.get("cycle") ?? "monthly"),
      status: String(formData.get("status") ?? "trialing"),
      price: Number(formData.get("price") ?? 0),
      expires_at: expiresRaw ? new Date(expiresRaw).toISOString() : null,
      note: String(formData.get("note") ?? "").trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("org_id", orgId);

  if (error) return { error: error.message };
  return { ok: true };
}
