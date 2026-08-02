import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type PlatformPayment = {
  promptpay_id: string;
  promptpay_name: string;
  payment_method: "promptpay" | "bank";
  bank_name: string;
  bank_account_no: string;
  bank_account_name: string;
  bank_qr_url: string;
  tax_name: string;
  tax_id: string;
  tax_address: string;
  tax_branch: string;
  tax_phone: string;
};

/**
 * ช่องทางรับเงินของบริษัท (PromptPay/บัญชี) ที่เจ้าของหอสแกนจ่ายค่าสมาชิก
 * + ข้อมูลใบกำกับภาษีของบริษัท
 * resilient: ถ้าตาราง/คอลัมน์ยังไม่มี → PromptPay fallback ไปที่ env
 */
export async function getPlatformPayment(): Promise<PlatformPayment> {
  const envPP = process.env.NEXT_PUBLIC_PLATFORM_PROMPTPAY ?? "";
  const empty: PlatformPayment = {
    promptpay_id: envPP,
    promptpay_name: "",
    payment_method: "promptpay",
    bank_name: "",
    bank_account_no: "",
    bank_account_name: "",
    bank_qr_url: "",
    tax_name: "",
    tax_id: "",
    tax_address: "",
    tax_branch: "สำนักงานใหญ่",
    tax_phone: "",
  };
  try {
    const admin = createAdminClient();
    // คอลัมน์เดิม (0034) — ต้องอ่านให้ได้เสมอ
    const { data, error } = await admin
      .from("platform_settings")
      .select("promptpay_id, promptpay_name, bank_name, bank_account_no, bank_account_name")
      .eq("id", 1)
      .maybeSingle();
    if (error) {
      // DB error = อาจทำ QR/พร้อมเพย์หายจากบิลเงียบ ๆ → ต้องดังพอให้รู้ (ข้อ 7)
      console.error(`[platform-payment] อ่าน platform_settings ไม่สำเร็จ (fallback env): ${error.message}`);
      return empty;
    }
    if (!data) return empty; // ยังไม่ได้ตั้งค่า — เคสปกติ ไม่ต้อง log

    const base: PlatformPayment = {
      ...empty,
      promptpay_id: (data.promptpay_id as string) || envPP,
      promptpay_name: (data.promptpay_name as string) ?? "",
      bank_name: (data.bank_name as string) ?? "",
      bank_account_no: (data.bank_account_no as string) ?? "",
      bank_account_name: (data.bank_account_name as string) ?? "",
    };

    // คอลัมน์ใหม่ (0035) — อ่านแยก เผื่อ prod ยังไม่ได้รัน migration
    const { data: ext } = await admin
      .from("platform_settings")
      .select("payment_method, tax_name, tax_id, tax_address, tax_branch")
      .eq("id", 1)
      .maybeSingle();
    if (ext) {
      base.payment_method = ((ext.payment_method as string) === "bank" ? "bank" : "promptpay");
      base.tax_name = (ext.tax_name as string) ?? "";
      base.tax_id = (ext.tax_id as string) ?? "";
      base.tax_address = (ext.tax_address as string) ?? "";
      base.tax_branch = (ext.tax_branch as string) || "สำนักงานใหญ่";
    }
    // tax_phone (0036) — อ่านแยก เผื่อ prod ยังไม่ได้รัน migration
    const { data: phoneRow } = await admin
      .from("platform_settings")
      .select("tax_phone")
      .eq("id", 1)
      .maybeSingle();
    if (phoneRow) base.tax_phone = (phoneRow.tax_phone as string) ?? "";
    // รูป QR บัญชีธนาคารที่อัปโหลดเอง (0046) — อ่านแยก เผื่อ prod ยังไม่ได้รัน migration
    const { data: qrRow } = await admin
      .from("platform_settings")
      .select("bank_qr_url")
      .eq("id", 1)
      .maybeSingle();
    if (qrRow) base.bank_qr_url = (qrRow.bank_qr_url as string) ?? "";

    // เตือนถ้าไม่มีช่องทางรับเงินเลย (พร้อมเพย์ว่าง + บัญชีว่าง + รูป QR ว่าง) — QR จะหายจากบิลบริษัท
    if (!base.promptpay_id && !base.bank_account_no && !base.bank_qr_url) {
      console.warn("[platform-payment] ไม่มีช่องทางรับเงินของบริษัทเลย (พร้อมเพย์/บัญชี/QR ว่างทั้งหมด) — QR จะหายจากบิล/ใบแจ้งหนี้");
    }
    return base;
  } catch (e) {
    console.error(`[platform-payment] exception (fallback env): ${(e as Error).message}`);
    return empty;
  }
}
