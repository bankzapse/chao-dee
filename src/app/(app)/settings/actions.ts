"use server";

import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/auth";
import type { FormState } from "@/components/action-form";
import { dbErrorMessage, NO_ROWS_MESSAGE } from "@/lib/db-error";

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
  const bank_qr_url = String(formData.get("bank_qr_url") ?? "").trim();

  // ไม่มี fallback ตัดคอลัมน์แล้ว — ของเดิมเงียบๆ ทิ้งข้อมูลบัญชี/รูป QR ที่ผู้ใช้เพิ่งกรอก
  // แล้วบอกว่าบันทึกสำเร็จ
  const { error } = await supabase
    .from("organizations")
    .update({ ...base, ...bank, bank_qr_url })
    .eq("id", org_id);
  if (error) return { error: dbErrorMessage(error.message) };

  // ช่องทางรับเงินหลัก (0035) — บันทึกแยก + ไม่ล้มถ้า prod ยังไม่มีคอลัมน์
  // ต้องเช็ค error — ของเดิมเขียนพลาดก็ยังบอกว่าบันทึกสำเร็จ
  // เจ้าของสลับเป็น "บัญชีธนาคาร" แล้วบิลยังโชว์พร้อมเพย์ โดยไม่มีอะไรเตือน
  const method = String(formData.get("payment_method") ?? "promptpay");
  if (method === "promptpay" || method === "bank") {
    const { data, error: mErr } = await supabase
      .from("organizations")
      .update({ payment_method: method })
      .eq("id", org_id)
      .select("id");
    if (mErr) return { error: dbErrorMessage(mErr.message) };
    if (!data?.length) return { error: NO_ROWS_MESSAGE };
  }
  return { ok: true };
}

/** บันทึกวิธีคิดค่าขยะ (ระบุรายห้อง / เหมาทุกห้อง) */
export async function updateGarbageSettings(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const supabase = await createClient();
  const org_id = await getOrgId();
  const mode = String(formData.get("garbage_mode") ?? "per_room") === "flat" ? "flat" : "per_room";
  const flatRaw = Number(formData.get("garbage_flat") ?? 0);
  const flat = Number.isFinite(flatRaw) ? Math.max(0, flatRaw) : 0;
  if (mode === "flat" && flat <= 0) return { error: "กรุณาระบุค่าขยะเหมาให้มากกว่า 0" };

  const { error } = await supabase
    .from("organizations")
    .update({ garbage_mode: mode, garbage_flat: flat })
    .eq("id", org_id);
  if (error) {
    if (/schema cache|could not find the .* column/i.test(error.message)) {
      return { error: "ยังไม่ได้อัปเดตฐานข้อมูล (migration 0043) — กรุณารัน migration ก่อน" };
    }
    return { error: error.message };
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

  // ไม่มี fallback ตัดคอลัมน์แล้ว — ของเดิมตัด tax_entity_type ทิ้งทั้งที่ tax_branch
  // ถูกล้างเป็น "" ไปแล้วตอนเลือกบุคคลธรรมดา → กลายเป็นนิติบุคคลที่ไม่มีสาขา
  // ซึ่งออกใบกำกับภาษีตาม ม.86/4 ไม่ถูกต้อง
  const { error } = await supabase
    .from("organizations")
    .update({ ...base, ...entity, tax_phone })
    .eq("id", org_id);
  if (error) return { error: dbErrorMessage(error.message) };
  return { ok: true };
}
