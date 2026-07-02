"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; otpSent?: boolean; phone?: string } | null;

/** แปลงเบอร์ไทยเป็น E.164 (+66...) */
function toE164(input: string): string | null {
  const d = input.replace(/\D/g, "");
  if (d.startsWith("0") && d.length === 10) return "+66" + d.slice(1);
  if (d.startsWith("66") && d.length === 11) return "+" + d;
  if (input.startsWith("+") && d.length >= 11) return "+" + d;
  return null;
}

/** ขั้น 1: ขอรหัส OTP ส่งไปยังเบอร์ */
export async function requestOtp(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const phone = toE164(String(formData.get("phone") ?? ""));
  if (!phone) return { error: "เบอร์โทรไม่ถูกต้อง (เช่น 0812345678)" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    phone,
    options: {
      channel: "sms",
      data: {
        full_name: String(formData.get("full_name") ?? "").trim(),
        org_name: String(formData.get("org_name") ?? "").trim(),
      },
    },
  });

  if (error) {
    if (error.status === 429) return { error: "ขอรหัสถี่เกินไป กรุณารอสักครู่", phone };
    return { error: error.message, phone };
  }
  return { otpSent: true, phone };
}

/** ขั้น 2: ยืนยันรหัส OTP → สร้าง session */
export async function verifyOtp(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const phone = String(formData.get("phone") ?? "");
  const token = String(formData.get("code") ?? "").trim();
  if (!phone || token.length < 4) return { error: "กรุณากรอกรหัส OTP", otpSent: true, phone };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ phone, token, type: "sms" });

  if (error) {
    return { error: "รหัส OTP ไม่ถูกต้องหรือหมดอายุ", otpSent: true, phone };
  }
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
