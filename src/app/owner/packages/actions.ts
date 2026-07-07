"use server";

import { requirePlatformAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import type { FormState } from "@/components/action-form";

/** owner แก้ราคาแพ็คเกจ (รายเดือน / รายปีต่อเดือน / รายปีรวม) */
export async function updatePackagePrice(
  slug: string,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const adminId = await requirePlatformAdmin();
  const num = (k: string) => {
    const raw = String(formData.get(k) ?? "").trim();
    return raw === "" ? null : Number(raw);
  };
  const price_monthly = num("price_monthly");
  const price_yearly_per_month = num("price_yearly_per_month");
  const price_yearly_total = num("price_yearly_total");

  const admin = createAdminClient();
  const { error } = await admin.from("package_prices").upsert(
    {
      slug,
      price_monthly,
      price_yearly_per_month,
      price_yearly_total,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "slug" }
  );
  if (error) return { error: error.message };

  await logAudit({
    org_id: null,
    actor_id: adminId,
    action: "แก้ราคาแพ็คเกจ",
    target: slug,
    meta: { price_monthly, price_yearly_per_month, price_yearly_total },
  });
  return { ok: true };
}
