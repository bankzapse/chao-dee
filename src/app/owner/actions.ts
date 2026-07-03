"use server";

import { requirePlatformAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
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

  await admin
    .from("subscription_payments")
    .update({
      status: "verified",
      verified_by: adminId,
      verified_at: new Date().toISOString(),
      period_start: periodStart,
      period_end: newExpiry.toISOString().slice(0, 10),
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
}

export async function rejectPayment(paymentId: string): Promise<void> {
  await requirePlatformAdmin();
  const admin = createAdminClient();
  await admin
    .from("subscription_payments")
    .update({ status: "rejected" })
    .eq("id", paymentId);
}

/** เปิด/ระงับสิทธิ์เร็ว */
export async function setOrgStatus(
  orgId: string,
  status: "active" | "cancelled"
): Promise<void> {
  await requirePlatformAdmin();
  const admin = createAdminClient();
  await admin
    .from("subscriptions")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("org_id", orgId);
}

/** แก้ไขแพ็คเกจ/สถานะ/วันหมดอายุด้วยมือ */
export async function updateSubscription(
  orgId: string,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requirePlatformAdmin();
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
