import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type PlatformPayment = {
  promptpay_id: string;
  promptpay_name: string;
  bank_name: string;
  bank_account_no: string;
  bank_account_name: string;
};

/**
 * ช่องทางรับเงินของบริษัท (PromptPay/บัญชี) ที่เจ้าของหอสแกนจ่ายค่าสมาชิก
 * resilient: ถ้าตารางยังไม่มี → PromptPay fallback ไปที่ env
 */
export async function getPlatformPayment(): Promise<PlatformPayment> {
  const envPP = process.env.NEXT_PUBLIC_PLATFORM_PROMPTPAY ?? "";
  const empty: PlatformPayment = {
    promptpay_id: envPP,
    promptpay_name: "",
    bank_name: "",
    bank_account_no: "",
    bank_account_name: "",
  };
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("platform_settings")
      .select("promptpay_id, promptpay_name, bank_name, bank_account_no, bank_account_name")
      .eq("id", 1)
      .maybeSingle();
    if (error || !data) return empty;
    return {
      promptpay_id: (data.promptpay_id as string) || envPP,
      promptpay_name: (data.promptpay_name as string) ?? "",
      bank_name: (data.bank_name as string) ?? "",
      bank_account_no: (data.bank_account_no as string) ?? "",
      bank_account_name: (data.bank_account_name as string) ?? "",
    };
  } catch {
    return empty;
  }
}
