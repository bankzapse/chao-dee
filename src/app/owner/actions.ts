"use server";

import { requirePlatformAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import { incrementPromoUse } from "@/lib/promo";
import { COMPANY } from "@/lib/company";
import type { FormState } from "@/components/action-form";

function addPeriod(from: Date, cycle: string): Date {
  const d = new Date(from);
  if (cycle === "yearly") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d;
}

/** บันทึกการชำระเงินของสมาชิก (สถานะ pending รอยืนยัน) */
export async function recordPayment(
  orgId: string,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requirePlatformAdmin();
  const admin = createAdminClient();
  const amount = Number(formData.get("amount") ?? 0);
  if (amount <= 0) return { error: "จำนวนเงินต้องมากกว่า 0" };

  const { error } = await admin.from("subscription_payments").insert({
    org_id: orgId,
    package_slug: String(formData.get("package_slug") ?? "pro"),
    cycle: String(formData.get("cycle") ?? "monthly"),
    amount,
    method: String(formData.get("method") ?? "transfer"),
    paid_at: String(formData.get("paid_at") ?? new Date().toISOString().slice(0, 10)),
    note: String(formData.get("note") ?? "").trim(),
    status: "pending",
  });
  if (error) return { error: error.message };
  return { ok: true };
}

/** ยืนยันการชำระ → เปิดสิทธิ์ (active) + ต่ออายุตามรอบ */
export async function verifyPayment(paymentId: string): Promise<void> {
  const adminId = await requirePlatformAdmin();
  const admin = createAdminClient();

  const { data: pay } = await admin
    .from("subscription_payments")
    .select("*")
    .eq("id", paymentId)
    .single();
  if (!pay) return;

  const { data: sub } = await admin
    .from("subscriptions")
    .select("expires_at")
    .eq("org_id", pay.org_id)
    .single();

  // ต่ออายุจากวันหมดอายุเดิม (ถ้ายังไม่หมด) หรือจากวันนี้
  const base =
    sub?.expires_at && new Date(sub.expires_at) > new Date()
      ? new Date(sub.expires_at)
      : new Date();
  const newExpiry = addPeriod(base, pay.cycle);
  const periodStart = new Date().toISOString().slice(0, 10);

  // ออกเลขที่ใบกำกับภาษี (เฉพาะเมื่อจด VAT แล้ว และยังไม่เคยออก)
  let taxInvoiceNo = pay.tax_invoice_no ?? "";
  if (COMPANY.vatRegistered && !taxInvoiceNo) {
    const { data: no } = await admin.rpc("next_tax_invoice_no");
    if (typeof no === "string") taxInvoiceNo = no;
  }

  await admin
    .from("subscription_payments")
    .update({
      status: "verified",
      verified_by: adminId,
      verified_at: new Date().toISOString(),
      period_start: periodStart,
      period_end: newExpiry.toISOString().slice(0, 10),
      tax_invoice_no: taxInvoiceNo,
    })
    .eq("id", paymentId);

  await admin
    .from("subscriptions")
    .update({
      status: "active",
      package_slug: pay.package_slug,
      cycle: pay.cycle,
      price: pay.amount,
      expires_at: newExpiry.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("org_id", pay.org_id);

  if (pay.promo_code) await incrementPromoUse(pay.promo_code);

  await logAudit({
    org_id: pay.org_id,
    actor_id: adminId,
    action: "ยืนยันการชำระเงิน",
    target: pay.package_slug,
    meta: { amount: Number(pay.amount), cycle: pay.cycle, payment_id: paymentId, promo: pay.promo_code || null },
  });
}

export async function rejectPayment(paymentId: string): Promise<void> {
  const adminId = await requirePlatformAdmin();
  const admin = createAdminClient();
  const { data: pay } = await admin
    .from("subscription_payments")
    .select("org_id, amount")
    .eq("id", paymentId)
    .maybeSingle();
  await admin
    .from("subscription_payments")
    .update({ status: "rejected" })
    .eq("id", paymentId);
  await logAudit({
    org_id: pay?.org_id ?? null,
    actor_id: adminId,
    action: "ปฏิเสธการชำระเงิน",
    meta: { amount: pay ? Number(pay.amount) : null, payment_id: paymentId },
  });
}

/** ลบสมาชิก (กิจการ) — ลบข้อมูลทั้งหมดของกิจการ + บัญชีเข้าระบบของทีมงานกิจการนั้น */
export async function deleteMember(orgId: string): Promise<void> {
  const adminId = await requirePlatformAdmin();
  const admin = createAdminClient();

  const { data: org } = await admin.from("organizations").select("name").eq("id", orgId).maybeSingle();

  // เก็บ user id ของบัญชีในกิจการนี้ (ไม่แตะแอดมินแพลตฟอร์ม)
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, is_platform_admin")
    .eq("org_id", orgId);
  const userIds = (profiles ?? []).filter((p) => !p.is_platform_admin).map((p) => p.id);

  // ลบกิจการ → cascade ลบ อาคาร/ห้อง/ผู้เช่า/สัญญา/บิล/สิทธิ์/โปรไฟล์ ที่ผูก org_id
  await admin.from("organizations").delete().eq("id", orgId);

  // ลบบัญชีเข้าระบบ (auth.users) เพื่อไม่ให้ล็อกอินได้อีก
  for (const uid of userIds) {
    await admin.auth.admin.deleteUser(uid).catch(() => null);
  }

  await logAudit({
    org_id: null,
    actor_id: adminId,
    action: "ลบสมาชิก",
    target: org?.name ?? orgId,
    meta: { org_id: orgId, removed_users: userIds.length },
  });
}

/** เปิด/ระงับสิทธิ์เร็ว */
export async function setOrgStatus(
  orgId: string,
  status: "active" | "cancelled"
): Promise<void> {
  const adminId = await requirePlatformAdmin();
  const admin = createAdminClient();
  await admin
    .from("subscriptions")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("org_id", orgId);
  await logAudit({
    org_id: orgId,
    actor_id: adminId,
    action: status === "active" ? "เปิดสิทธิ์การใช้งาน" : "ระงับการใช้งาน",
  });
}

/** แก้ไขแพ็คเกจ/สถานะ/วันหมดอายุด้วยมือ */
export async function updateSubscription(
  orgId: string,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const adminId = await requirePlatformAdmin();
  const admin = createAdminClient();
  const expiresRaw = String(formData.get("expires_at") ?? "").trim();
  const pkg = String(formData.get("package_slug") ?? "pro");
  const status = String(formData.get("status") ?? "trialing");

  const { error } = await admin
    .from("subscriptions")
    .update({
      package_slug: pkg,
      cycle: String(formData.get("cycle") ?? "monthly"),
      status,
      price: Number(formData.get("price") ?? 0),
      expires_at: expiresRaw ? new Date(expiresRaw).toISOString() : null,
      note: String(formData.get("note") ?? "").trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("org_id", orgId);
  if (error) return { error: error.message };
  await logAudit({
    org_id: orgId,
    actor_id: adminId,
    action: "แก้ไขการสมัครสมาชิก",
    target: pkg,
    meta: { status, expires_at: expiresRaw || null },
  });
  return { ok: true };
}

/** อนุมัติคำขอโปรโมทประกาศ → ตั้ง featured + วันหมดอายุ (ต่อจากของเดิมถ้ายังโปรโมทอยู่) */
export async function approvePromotion(promoId: string): Promise<void> {
  const adminId = await requirePlatformAdmin();
  const admin = createAdminClient();

  const { data: promo } = await admin
    .from("listing_promotions")
    .select("*")
    .eq("id", promoId)
    .single();
  if (!promo || promo.status !== "pending") return;

  const { data: listing } = await admin
    .from("property_listings")
    .select("featured_until, title")
    .eq("id", promo.listing_id)
    .single();

  const start = new Date();
  // ต่ออายุจากวันหมดโปรโมทเดิม (ถ้ายังไม่หมด) ไม่งั้นเริ่มวันนี้
  const base =
    listing?.featured_until && new Date(listing.featured_until) > start
      ? new Date(listing.featured_until)
      : start;
  const expires = new Date(base.getTime() + Number(promo.days) * 86400000);
  const startStr = start.toISOString().slice(0, 10);
  const expiresStr = expires.toISOString().slice(0, 10);

  await admin
    .from("listing_promotions")
    .update({ status: "active", starts_at: startStr, expires_at: expiresStr })
    .eq("id", promoId);

  await admin
    .from("property_listings")
    .update({ is_featured: true, featured_until: expiresStr })
    .eq("id", promo.listing_id);

  await logAudit({
    org_id: promo.org_id,
    actor_id: adminId,
    action: "อนุมัติโปรโมทประกาศ",
    target: listing?.title ?? promo.listing_id,
    meta: { promo_id: promoId, days: Number(promo.days), amount: Number(promo.amount), until: expiresStr },
  });
}

/** ปฏิเสธคำขอโปรโมท */
export async function rejectPromotion(promoId: string): Promise<void> {
  const adminId = await requirePlatformAdmin();
  const admin = createAdminClient();
  const { data: promo } = await admin
    .from("listing_promotions")
    .select("org_id, listing_id")
    .eq("id", promoId)
    .single();
  await admin.from("listing_promotions").update({ status: "rejected" }).eq("id", promoId);
  if (promo) {
    await logAudit({
      org_id: promo.org_id,
      actor_id: adminId,
      action: "ปฏิเสธคำขอโปรโมท",
      target: promo.listing_id,
      meta: { promo_id: promoId },
    });
  }
}

/** owner ตั้งราคาโปรโมทเอง (ต่อจำนวนวัน) — override ค่า default ในโค้ด */
export async function updatePromoPrice(
  days: number,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const adminId = await requirePlatformAdmin();
  const raw = String(formData.get("price") ?? "").trim();
  const price = Number(raw);
  if (!raw || !Number.isFinite(price) || price < 0) return { error: "กรุณาระบุราคาที่ถูกต้อง" };

  const admin = createAdminClient();
  const { error } = await admin.from("promo_prices").upsert(
    { days, price, updated_at: new Date().toISOString() },
    { onConflict: "days" }
  );
  if (error) return { error: error.message };

  await logAudit({
    org_id: null,
    actor_id: adminId,
    action: "แก้ราคาโปรโมท",
    target: `${days} วัน`,
    meta: { days, price },
  });
  return { ok: true };
}

/** owner ตั้งค่าช่องทางรับเงินของบริษัท (PromptPay/บัญชีธนาคาร) */
export async function savePlatformPayment(_prev: FormState, formData: FormData): Promise<FormState> {
  const adminId = await requirePlatformAdmin();
  const g = (k: string) => String(formData.get(k) ?? "").trim();
  const admin = createAdminClient();
  const method = g("payment_method") === "bank" ? "bank" : "promptpay";
  const base = {
    id: 1,
    promptpay_id: g("promptpay_id"),
    promptpay_name: g("promptpay_name"),
    bank_name: g("bank_name"),
    bank_account_no: g("bank_account_no"),
    bank_account_name: g("bank_account_name"),
    updated_at: new Date().toISOString(),
  };
  const extNoPhone = {
    payment_method: method,
    tax_name: g("tax_name"),
    tax_id: g("tax_id").replace(/\D/g, ""),
    tax_address: g("tax_address"),
    tax_branch: g("tax_branch") || "สำนักงานใหญ่",
  };
  const missingCol = (m?: string) => !!m && /schema cache|could not find the .* column/i.test(m);
  let { error } = await admin
    .from("platform_settings")
    .upsert({ ...base, ...extNoPhone, tax_phone: g("tax_phone") }, { onConflict: "id" });
  // resilient: ตัดคอลัมน์ใหม่ที่ prod ยังไม่มีออกทีละชั้น (0036 → 0035 → เดิม)
  if (missingCol(error?.message)) {
    ({ error } = await admin.from("platform_settings").upsert({ ...base, ...extNoPhone }, { onConflict: "id" }));
  }
  if (missingCol(error?.message)) {
    ({ error } = await admin.from("platform_settings").upsert(base, { onConflict: "id" }));
  }
  if (error) return { error: error.message };
  await logAudit({ org_id: null, actor_id: adminId, action: "ตั้งค่าช่องทางรับเงิน", target: "platform_settings", meta: {} });
  return { ok: true };
}
