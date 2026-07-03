"use server";

import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/auth";
import { packageBySlug } from "@/lib/packages";

/** สมาชิกส่งคำขอต่ออายุ (สถานะ pending) → เจ้าของระบบยืนยันในภายหลัง */
export async function submitRenewal(data: {
  package_slug: string;
  cycle: "monthly" | "yearly";
  slip_path: string;
}): Promise<{ ok?: boolean; error?: string }> {
  const pkg = packageBySlug(data.package_slug);
  if (!pkg || pkg.priceMonthly === null) {
    return { error: "แพ็คเกจนี้กรุณาติดต่อทีมงานโดยตรง" };
  }
  const amount =
    data.cycle === "yearly" ? pkg.priceYearlyTotal! : pkg.priceMonthly;

  const supabase = await createClient();
  const org_id = await getOrgId();

  const { error } = await supabase.from("subscription_payments").insert({
    org_id,
    package_slug: data.package_slug,
    cycle: data.cycle,
    amount,
    method: "promptpay",
    status: "pending",
    slip_path: data.slip_path,
    note: "ต่ออายุโดยสมาชิก (รอยืนยัน)",
  });
  if (error) return { error: error.message };
  return { ok: true };
}
