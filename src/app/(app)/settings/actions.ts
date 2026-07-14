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

  // ช่องทางรับเงินหลัก (0035) — บันทึกแยก + ไม่ล้มถ้า prod ยังไม่มีคอลัมน์
  const method = String(formData.get("payment_method") ?? "promptpay");
  if (method === "promptpay" || method === "bank") {
    await supabase.from("organizations").update({ payment_method: method }).eq("id", org_id);
  }
  return { ok: true };
}

/** บันทึกข้อมูลสำหรับออกใบกำกับภาษี (ข้อมูลผู้ซื้อ = กิจการนี้) */
export async function updateTaxInfo(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const supabase = await createClient();
  const org_id = await getOrgId();
  const isIndiv = String(formData.get("tax_entity_type") ?? "juristic") === "individual";
  const base = {
    tax_name: String(formData.get("tax_name") ?? "").trim(),
    tax_id: String(formData.get("tax_id") ?? "").replace(/\D/g, ""),
    tax_address: String(formData.get("tax_address") ?? "").trim(),
    // บุคคลธรรมดาไม่มีสาขา
    tax_branch: isIndiv ? "" : String(formData.get("tax_branch") ?? "สำนักงานใหญ่").trim(),
  };
  const tax_phone = String(formData.get("tax_phone") ?? "").trim();

  // ต้องกรอกให้ครบทุกช่อง
  if (!base.tax_name) return { error: `กรุณากรอก${isIndiv ? "ชื่อ-นามสกุล" : "ชื่อผู้เสียภาษี"}` };
  if (base.tax_id.length !== 13) return { error: `กรุณากรอก${isIndiv ? "เลขประจำตัวประชาชน" : "เลขประจำตัวผู้เสียภาษี"} 13 หลัก` };
  if (!base.tax_address) return { error: "กรุณากรอกที่อยู่ตามใบกำกับภาษี" };
  if (!tax_phone) return { error: "กรุณากรอกเบอร์โทรติดต่อ" };

  const entity = { tax_entity_type: isIndiv ? "individual" : "juristic" };
  const missingCol = (m?: string) => !!m && /schema cache|could not find the .* column/i.test(m);

  // resilient แบบชั้น: full(+phone 0038) → +entity(0037) → base เดิม
  let { error } = await supabase
    .from("organizations")
    .update({ ...base, ...entity, tax_phone })
    .eq("id", org_id);
  if (missingCol(error?.message)) {
    ({ error } = await supabase.from("organizations").update({ ...base, ...entity }).eq("id", org_id));
  }
  if (missingCol(error?.message)) {
    ({ error } = await supabase.from("organizations").update(base).eq("id", org_id));
  }
  if (error) return { error: error.message };
  return { ok: true };
}
