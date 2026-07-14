import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type PlatformPayment = {
  promptpay_id: string;
  promptpay_name: string;
  payment_method: "promptpay" | "bank";
  bank_name: string;
  bank_account_no: string;
  bank_account_name: string;
  tax_name: string;
  tax_id: string;
  tax_address: string;
  tax_branch: string;
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
    tax_name: "",
    tax_id: "",
    tax_address: "",
    tax_branch: "สำนักงานใหญ่",
  };
  try {
    const admin = createAdminClient();
    // คอลัมน์เดิม (0034) — ต้องอ่านให้ได้เสมอ
    const { data, error } = await admin
      .from("platform_settings")
      .select("promptpay_id, promptpay_name, bank_name, bank_account_no, bank_account_name")
      .eq("id", 1)
      .maybeSingle();
    if (error || !data) return empty;

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
    return base;
  } catch {
    return empty;
  }
}
