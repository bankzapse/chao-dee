"use server";

import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/auth";
import type { FormState } from "@/components/action-form";

export async function updateOrgSettings(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "กรุณาระบุชื่อกิจการ" };

  const supabase = await createClient();
  const org_id = await getOrgId();
  const base = {
    name,
    promptpay_id: String(formData.get("promptpay_id") ?? "").trim(),
    promptpay_name: String(formData.get("promptpay_name") ?? "").trim(),
    invoice_note: String(formData.get("invoice_note") ?? "").trim(),
  };
  const bank = {
    bank_name: String(formData.get("bank_name") ?? "").trim(),
    bank_account_no: String(formData.get("bank_account_no") ?? "").trim(),
    bank_account_name: String(formData.get("bank_account_name") ?? "").trim(),
  };

  let { error } = await supabase.from("organizations").update({ ...base, ...bank }).eq("id", org_id);
  // resilient: ถ้ายังไม่ได้รัน migration 0033 (คอลัมน์บัญชีธนาคาร) → บันทึกเฉพาะส่วนเดิม
  if (error && /schema cache|could not find the .* column/i.test(error.message)) {
    ({ error } = await supabase.from("organizations").update(base).eq("id", org_id));
  }
  if (error) return { error: error.message };
  return { ok: true };
}

/** บันทึกข้อมูลสำหรับออกใบกำกับภาษี (ข้อมูลผู้ซื้อ = กิจการนี้) */
export async function updateTaxInfo(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const supabase = await createClient();
  const org_id = await getOrgId();
  const { error } = await supabase
    .from("organizations")
    .update({
      tax_name: String(formData.get("tax_name") ?? "").trim(),
      tax_id: String(formData.get("tax_id") ?? "").replace(/\D/g, ""),
      tax_address: String(formData.get("tax_address") ?? "").trim(),
      tax_branch: String(formData.get("tax_branch") ?? "สำนักงานใหญ่").trim(),
    })
    .eq("id", org_id);
  if (error) return { error: error.message };
  return { ok: true };
}
