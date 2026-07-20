"use server";

import { getOrgId } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AGENCY_TERMS_VERSION } from "@/lib/agency";

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

/** แนบสลิปชำระค่านายหน้า — เขียนผ่าน service role แต่ตรวจว่าดีลเป็นของ org ผู้เรียกก่อน */
export async function submitCommissionPayment(
  dealId: string,
  slipPath: string
): Promise<{ ok?: boolean; error?: string }> {
  const org_id = await getOrgId();
  const admin = createAdminClient();
  const { data: deal } = await admin
    .from("agency_deals")
    .select("id, org_id, status")
    .eq("id", dealId)
    .maybeSingle();
  const d = deal as { id: string; org_id: string; status: string } | null;
  if (!d || d.org_id !== org_id) return { error: "ไม่พบดีลนี้" };
  if (d.status !== "invoiced") return { error: "ดีลนี้ยังไม่ได้วางบิล หรือชำระไปแล้ว" };

  const { error } = await admin
    .from("agency_deals")
    .update({ slip_path: slipPath, updated_at: new Date().toISOString() })
    .eq("id", dealId);
  if (error) return { error: error.message };
  return { ok: true };
}
