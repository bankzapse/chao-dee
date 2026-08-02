"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, sweepIfNeeded } from "@/lib/rate-limit";
import { toE164 } from "@/lib/phone";
import { thaiAuthError } from "@/lib/auth-errors";
import { sendWelcomeIfNeeded } from "@/lib/onboarding";

export type AuthState = { error?: string; otpSent?: boolean; phone?: string } | null;

/** ปลายทางหลังล็อกอิน — รับเฉพาะ path ภายใน (กัน open-redirect) */
function safeNext(v: FormDataEntryValue | null): string {
  const s = String(v ?? "").trim();
  return s.startsWith("/") && !s.startsWith("//") ? s : "/dashboard";
}

/** IP ผู้เรียก (สำหรับ rate limit) */
async function clientIp(): Promise<string> {
  return (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

/**
 * จำกัดอัตราทางเข้า auth — กัน brute-force รหัสผ่าน/OTP และการยิง OTP ถี่
 * จำกัดทั้งต่อ "เบอร์" (limit) และต่อ "IP" (หลวมกว่าเผื่อ NAT) · คืน retryAfter วินาที (0 = ผ่าน)
 * หมายเหตุ: in-memory แยกตาม serverless instance (ดู lib/rate-limit.ts) — ชั้น durable ดูข้อ 6
 */
function authLimit(scope: string, phone: string, ip: string, limit: number, windowMs: number): number {
  sweepIfNeeded();
  const perPhone = rateLimit(`${scope}:ph:${phone}`, limit, windowMs);
  if (!perPhone.ok) return perPhone.retryAfter;
  const perIp = rateLimit(`${scope}:ip:${ip}`, limit * 4, windowMs);
  if (!perIp.ok) return perIp.retryAfter;
  return 0;
}

/** ยืนยันรหัส OTP → สร้าง session (ใช้ตอนสมัครสมาชิกยืนยันเบอร์) */
export async function verifyOtp(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const phone = String(formData.get("phone") ?? "");
  const token = String(formData.get("code") ?? "").trim();
  if (!phone || token.length < 4) return { error: "กรุณากรอกรหัส OTP", otpSent: true, phone };

  const ra = authLimit("verify-otp", phone, await clientIp(), 10, 60_000);
  if (ra) return { error: `ลองบ่อยเกินไป กรุณารอ ${ra} วินาที`, otpSent: true, phone };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ phone, token, type: "sms" });

  if (error) {
    return { error: thaiAuthError(error), otpSent: true, phone };
  }
  // ส่งอีเมลต้อนรับครั้งแรก (best-effort — ไม่ขวาง flow)
  const { data: { user } } = await supabase.auth.getUser();
  if (user) await sendWelcomeIfNeeded(user.id);
  redirect(safeNext(formData.get("next")));
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

  const ra = authLimit("login-pw", phone, await clientIp(), 5, 60_000);
  if (ra) return { error: `พยายามเข้าสู่ระบบบ่อยเกินไป ลองใหม่ใน ${ra} วินาที`, phone };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ phone, password });
  if (error) return { error: "เบอร์หรือรหัสผ่านไม่ถูกต้อง", phone };
  redirect(safeNext(formData.get("next")));
}

/** ลืมรหัสผ่าน — ขั้น 1: ตรวจว่ามีบัญชี แล้วส่ง OTP */
export async function requestPasswordReset(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const raw = String(formData.get("phone") ?? "");
  const phone = toE164(raw);
  if (!phone) return { error: "เบอร์โทรไม่ถูกต้อง (เช่น 0812345678)" };

  const ra = authLimit("reset-otp", phone, await clientIp(), 5, 5 * 60_000);
  if (ra) return { error: `ขอรหัสบ่อยเกินไป กรุณารอ ${ra} วินาที`, phone };

  // กัน user enumeration: ไม่เปิดเผยว่าเบอร์นี้มีบัญชีหรือไม่ — ตอบ "ส่งรหัสแล้ว" เหมือนกันทุกกรณี
  // shouldCreateUser:false → ถ้าเบอร์ไม่มีบัญชี Supabase จะไม่ส่ง SMS (ไม่เปลืองไม่สร้างบัญชี)
  // ถ้ามีบัญชีจริงจะได้รับ OTP · กรณี error (ไม่มีบัญชี/SMS ขัดข้อง) ไม่ surface ต่างกัน
  const supabase = await createClient();
  await supabase.auth.signInWithOtp({
    phone,
    options: { channel: "sms", shouldCreateUser: false },
  });
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

  const ra = authLimit("reset-verify", phone, await clientIp(), 10, 60_000);
  if (ra) return { error: `ลองบ่อยเกินไป กรุณารอ ${ra} วินาที`, otpSent: true, phone };

  const supabase = await createClient();
  // ยืนยัน OTP → ได้ session (OTP ใช้ได้ครั้งเดียว)
  const { error: vErr } = await supabase.auth.verifyOtp({ phone, token, type: "sms" });
  if (vErr) return { error: thaiAuthError(vErr), otpSent: true, phone };

  // ตั้งรหัสผ่านใหม่ — ถ้าเป็นรหัสซ้ำเดิม ผู้ใช้ยืนยันตัวตนผ่านแล้ว (มี session) → ให้เข้าระบบเลย
  const { error: uErr } = await supabase.auth.updateUser({ password });
  if (uErr) {
    if ((uErr as { code?: string }).code === "same_password" || /different from the old|should be different|same password/i.test(uErr.message)) {
      redirect("/dashboard"); // เข้าสู่ระบบสำเร็จแล้ว (รหัสไม่เปลี่ยนเพราะซ้ำเดิม)
    }
    // OTP ถูกใช้ไปแล้ว — ต้องขอใหม่หากจะลองอีกครั้ง
    return { error: thaiAuthError(uErr) + " (หากลองใหม่ กรุณากด “ขอรหัสใหม่”)", otpSent: true, phone };
  }

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  // อย่าให้ error ตอน signOut มาบล็อกการออกจากระบบ — เด้งออกเสมอ
  try {
    await supabase.auth.signOut();
  } catch {
    /* เพิกเฉย — ล้าง session ฝั่ง client ก็พอ */
  }
  redirect("/login");
}
