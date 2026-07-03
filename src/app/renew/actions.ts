"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrgId } from "@/lib/auth";
import { packageBySlug } from "@/lib/packages";
import { sendSms, isSmsConfigured } from "@/lib/sms";

/** แจ้งเตือนผู้ดูแลแพลตฟอร์มว่ามีคำขอต่ออายุใหม่ (best-effort ไม่ทำให้คำขอล้มเหลว) */
async function notifyAdminsNewRenewal(org_id: string, pkgName: string, amount: number) {
  if (!isSmsConfigured()) return;
  try {
    const admin = createAdminClient();
    const [{ data: org }, { data: admins }] = await Promise.all([
      admin.from("organizations").select("name").eq("id", org_id).maybeSingle(),
      admin.from("profiles").select("phone").eq("is_platform_admin", true),
    ]);
    const orgName = org?.name ?? "กิจการ";
    const msg = `ChaoDee: มีคำขอต่ออายุใหม่จาก "${orgName}" แพ็คเกจ ${pkgName} ฿${amount.toLocaleString()} — ตรวจสอบที่ chao-dee.com/owner/payments`;
    await Promise.all(
      (admins ?? [])
        .map((a) => a.phone)
        .filter((p): p is string => Boolean(p))
        .map((phone) => sendSms(phone, msg).catch(() => null))
    );
  } catch {
    // เงียบไว้ — การแจ้งเตือนล้มเหลวไม่ควรกระทบการบันทึกคำขอ
  }
}

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

  await notifyAdminsNewRenewal(org_id, pkg.name, amount);
  return { ok: true };
}
