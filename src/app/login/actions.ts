"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { toE164, toE164Digits } from "@/lib/phone";

export type AuthState = { error?: string; otpSent?: boolean; phone?: string } | null;

/** เช็คว่ามีบัญชีที่ใช้เบอร์นี้แล้วหรือยัง (กันการยิง OTP ใส่เบอร์มั่ว) */
async function phoneRegistered(input: string): Promise<boolean> {
  const digits = toE164Digits(input);
  if (!digits) return false;
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("id").eq("phone", digits).maybeSingle();
  return Boolean(data);
}

/** ขั้น 1 (เข้าสู่ระบบด้วย OTP): ตรวจว่ามีบัญชีก่อน แล้วจึงส่ง OTP */
export async function requestOtp(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const raw = String(formData.get("phone") ?? "");
  const phone = toE164(raw);
  if (!phone) return { error: "เบอร์โทรไม่ถูกต้อง (เช่น 0812345678)" };

  // กันการยิง OTP ใส่เบอร์ที่ยังไม่ได้สมัคร
  if (!(await phoneRegistered(raw))) {
    return { error: "ไม่พบบัญชีที่ใช้เบอร์นี้ กรุณาสมัครใช้งานก่อน", phone };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    phone,
    options: { channel: "sms", shouldCreateUser: false },
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

/** เข้าสู่ระบบด้วยเบอร์ + รหัสผ่าน (สำหรับผู้ใช้ที่ตั้งรหัสผ่านตอนสมัคร) */
export async function loginWithPassword(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const phone = toE164(String(formData.get("phone") ?? ""));
  const password = String(formData.get("password") ?? "");
  if (!phone) return { error: "เบอร์โทรไม่ถูกต้อง (เช่น 0812345678)" };
  if (!password) return { error: "กรุณากรอกรหัสผ่าน" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ phone, password });
  if (error) return { error: "เบอร์หรือรหัสผ่านไม่ถูกต้อง", phone };
  redirect("/dashboard");
}

/** ลืมรหัสผ่าน — ขั้น 1: ตรวจว่ามีบัญชี แล้วส่ง OTP */
export async function requestPasswordReset(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const raw = String(formData.get("phone") ?? "");
  const phone = toE164(raw);
  if (!phone) return { error: "เบอร์โทรไม่ถูกต้อง (เช่น 0812345678)" };
  if (!(await phoneRegistered(raw))) {
    return { error: "ไม่พบบัญชีที่ใช้เบอร์นี้", phone };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    phone,
    options: { channel: "sms", shouldCreateUser: false },
  });
  if (error) {
    if (error.status === 429) return { error: "ขอรหัสถี่เกินไป กรุณารอสักครู่", phone };
    return { error: error.message, phone };
  }
  return { otpSent: true, phone };
}

/** ลืมรหัสผ่าน — ขั้น 2: ยืนยัน OTP แล้วตั้งรหัสผ่านใหม่ */
export async function confirmPasswordReset(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const phone = String(formData.get("phone") ?? "");
  const token = String(formData.get("code") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (token.length < 4) return { error: "กรุณากรอกรหัส OTP", otpSent: true, phone };
  if (password.length < 8) return { error: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร", otpSent: true, phone };

  const supabase = await createClient();
  // ยืนยัน OTP → ได้ session
  const { error: vErr } = await supabase.auth.verifyOtp({ phone, token, type: "sms" });
  if (vErr) return { error: "รหัส OTP ไม่ถูกต้องหรือหมดอายุ", otpSent: true, phone };

  // ตั้งรหัสผ่านใหม่
  const { error: uErr } = await supabase.auth.updateUser({ password });
  if (uErr) return { error: uErr.message, otpSent: true, phone };

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
