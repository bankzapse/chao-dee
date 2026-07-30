"use server";

import { getOrgId } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AGENCY_TERMS_VERSION, commissionBreakdown } from "@/lib/agency";
import { COMPANY } from "@/lib/company";

function missingCol(msg?: string) {
  return Boolean(msg && /schema cache|could not find the .* column|does not exist/i.test(msg));
}

/** เจ้าของหอกดยอมรับสัญญานายหน้า (click-wrap) — บันทึกเวอร์ชัน + เวลา */
export async function acceptAgencyTerms(): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient();
  const org_id = await getOrgId();
  const { error } = await supabase
    .from("organizations")
    .update({
      agency_enabled: true,
      agency_agreed_at: new Date().toISOString(),
      agency_terms_version: AGENCY_TERMS_VERSION,
    })
    .eq("id", org_id);
  if (error) {
    if (missingCol(error.message)) return { error: "ยังไม่ได้อัปเดตฐานข้อมูล (migration 0044)" };
    return { error: error.message };
  }
  return { ok: true };
}

/** ปิดรับบริการนายหน้า (ไม่กระทบดีลที่เกิดขึ้นแล้ว) */
export async function disableAgency(): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient();
  const org_id = await getOrgId();
  const { error } = await supabase.from("organizations").update({ agency_enabled: false }).eq("id", org_id);
  if (error) return { error: error.message };
  return { ok: true };
}

/**
 * แนบสลิปชำระค่านายหน้า — เขียนผ่าน service role แต่ตรวจว่าดีลเป็นของ org ผู้เรียกก่อน
 *
 * withholdTax = true → เลือก "แบบ B": หักภาษี ณ ที่จ่าย 3% แล้วโอนสุทธิ (นิติบุคคลเท่านั้น)
 *               = false → "แบบ A": จ่ายเต็ม
 * เก็บ snapshot ยอด (wht/net) + เวลารับรอง เพื่อให้เอกสารตรงกับที่จ่ายจริงเสมอ
 */
export async function submitCommissionPayment(
  dealId: string,
  slipPath: string,
  withholdTax = false
): Promise<{ ok?: boolean; error?: string }> {
  const org_id = await getOrgId();
  const admin = createAdminClient();
  const { data: deal } = await admin
    .from("agency_deals")
    .select("id, org_id, status, commission_amount")
    .eq("id", dealId)
    .maybeSingle();
  const d = deal as { id: string; org_id: string; status: string; commission_amount: number } | null;
  if (!d || d.org_id !== org_id) return { error: "ไม่พบดีลนี้" };
  if (d.status !== "invoiced") return { error: "ดีลนี้ยังไม่ได้วางบิล หรือชำระไปแล้ว" };

  // ประเภทผู้เสียภาษีของหอ → ใช้ตัดสินว่าหัก ณ ที่จ่ายได้ไหม
  const { data: orgRow } = await admin
    .from("organizations")
    .select("tax_entity_type")
    .eq("id", org_id)
    .maybeSingle();
  const isJuristic = ((orgRow as { tax_entity_type?: string } | null)?.tax_entity_type ?? "juristic") === "juristic";
  const tax = commissionBreakdown(Number(d.commission_amount), {
    vatRegistered: COMPANY.vatRegistered,
    vatRate: COMPANY.vatRate,
    isJuristic,
  });
  // หัก ณ ที่จ่ายได้เฉพาะนิติบุคคล + มียอดหักจริง
  const applyWht = withholdTax && isJuristic && tax.wht > 0;

  const full = {
    slip_path: slipPath,
    wht_amount: applyWht ? tax.wht : 0,
    net_amount: applyWht ? tax.net : tax.total,
    wht_ack_at: applyWht ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };
  let { error } = await admin.from("agency_deals").update(full).eq("id", dealId);
  // เผื่อ prod ยังไม่ได้รัน 0049 (คอลัมน์ wht/net ยังไม่มี)
  if (error && missingCol(error.message)) {
    // แบบ B (หัก ณ ที่จ่าย) เก็บ snapshot ไม่ได้ → ห้ามบันทึกเป็นจ่ายเต็ม ไม่งั้นใบเสร็จยอดเพี้ยน + ภาระหนังสือรับรองหาย
    if (applyWht) {
      return { error: "ระบบยังไม่พร้อมสำหรับหัก ณ ที่จ่าย กรุณาเลือกจ่ายเต็ม หรือติดต่อผู้ดูแล (migration 0049)" };
    }
    // แบบ A (จ่ายเต็ม) — เก็บแค่สลิปได้ ยอดตรง (net = total อยู่แล้ว)
    ({ error } = await admin
      .from("agency_deals")
      .update({ slip_path: slipPath, updated_at: new Date().toISOString() })
      .eq("id", dealId));
  }
  if (error) return { error: error.message };
  return { ok: true };
}
