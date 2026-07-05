"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrgId } from "@/lib/auth";
import { packageBySlug } from "@/lib/packages";
import { sendSms, isSmsConfigured } from "@/lib/sms";
import { applyPromo } from "@/lib/promo";
import { isSlipVerifyConfigured, verifySlipImage } from "@/lib/slip";

/** ตรวจสลิปอัตโนมัติ (ถ้าตั้งค่าไว้) แล้วบันทึกผลลง note ของการชำระ — best-effort */
async function autoCheckSlip(paymentId: string, slipPath: string, expected: number) {
  if (!isSlipVerifyConfigured() || !slipPath) return;
  try {
    const admin = createAdminClient();
    const { data: blob } = await admin.storage.from("slips").download(slipPath);
    if (!blob) return;
    const res = await verifySlipImage(await blob.arrayBuffer(), blob.type);
    if (!res.ok) return;
    const matched = typeof res.amount === "number" && Math.abs(res.amount - expected) < 1;
    const note = matched
      ? `✓ ตรวจสลิปอัตโนมัติ: ยอด ฿${res.amount} ตรง (ref ${res.transRef || "-"})`
      : `⚠ ตรวจสลิปอัตโนมัติ: ยอด ฿${res.amount ?? "?"} (คาด ฿${expected}) ref ${res.transRef || "-"}`;
    await admin.from("subscription_payments").update({ note }).eq("id", paymentId);
  } catch {
    /* best-effort */
  }
}

/** ราคาตั้งต้นของแพ็คเกจตามรอบ */
function baseAmount(slug: string, cycle: "monthly" | "yearly"): number | null {
  const pkg = packageBySlug(slug);
  if (!pkg || pkg.priceMonthly === null) return null;
  return cycle === "yearly" ? pkg.priceYearlyTotal! : pkg.priceMonthly;
}

/** ตรวจโค้ดส่วนลด (เรียกจากฟอร์มก่อนชำระ) */
export async function checkPromo(
  code: string,
  package_slug: string,
  cycle: "monthly" | "yearly"
): Promise<{ ok?: boolean; error?: string; discount?: number; final?: number }> {
  const base = baseAmount(package_slug, cycle);
  if (base === null) return { error: "แพ็คเกจนี้กรุณาติดต่อทีมงาน" };
  const res = await applyPromo(code, base);
  if (!res.ok) return { error: res.error };
  return { ok: true, discount: res.discount, final: res.final };
}

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
    const msg = `Chao-Dee: มีคำขอต่ออายุใหม่จาก "${orgName}" แพ็คเกจ ${pkgName} ฿${amount.toLocaleString()} — ตรวจสอบที่ chao-dee.com/owner/payments`;
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
  promo_code?: string;
}): Promise<{ ok?: boolean; error?: string }> {
  const pkg = packageBySlug(data.package_slug);
  if (!pkg || pkg.priceMonthly === null) {
    return { error: "แพ็คเกจนี้กรุณาติดต่อทีมงานโดยตรง" };
  }
  const base = data.cycle === "yearly" ? pkg.priceYearlyTotal! : pkg.priceMonthly;

  // คำนวณส่วนลดใหม่ฝั่ง server (กันการปลอมยอด)
  let amount = base;
  let discount = 0;
  let promoCode = "";
  if (data.promo_code?.trim()) {
    const res = await applyPromo(data.promo_code, base);
    if (!res.ok) return { error: res.error };
    amount = res.final;
    discount = res.discount;
    promoCode = res.code;
  }

  const supabase = await createClient();
  const org_id = await getOrgId();

  const { data: inserted, error } = await supabase
    .from("subscription_payments")
    .insert({
      org_id,
      package_slug: data.package_slug,
      cycle: data.cycle,
      amount,
      discount,
      promo_code: promoCode,
      method: "promptpay",
      status: "pending",
      slip_path: data.slip_path,
      note: promoCode
        ? `ต่ออายุโดยสมาชิก (รอยืนยัน) · ใช้โค้ด ${promoCode} ลด ${discount}`
        : "ต่ออายุโดยสมาชิก (รอยืนยัน)",
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  if (inserted?.id) await autoCheckSlip(inserted.id, data.slip_path, amount);
  await notifyAdminsNewRenewal(org_id, pkg.name, amount);
  return { ok: true };
}
