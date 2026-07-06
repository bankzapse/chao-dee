"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { toE164 } from "@/lib/phone";

export type SignupState = {
  error?: string;
  otpSent?: boolean;
  phone?: string;
} | null;

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

/** ขั้น 1: สมัคร — เก็บข้อมูลหอ + ตั้งรหัสผ่าน แล้วส่ง OTP ยืนยันเบอร์ */
export async function signUpRequest(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const g = (k: string) => String(formData.get(k) ?? "").trim();

  const org_name = g("org_name");
  const province = g("province");
  const district = g("district");
  const subdistrict = g("subdistrict");
  const room_count = g("room_count");
  const building_type = g("building_type") || "dorm";
  const prop_status = g("prop_status");
  const first = g("first_name");
  const last = g("last_name");
  const email = g("email");
  const password = String(formData.get("password") ?? "");
  const promo = g("promo");
  const phone = toE164(g("phone"));

  // ตรวจความครบถ้วน (ตามฟิลด์บังคับ *)
  if (!org_name) return { error: "กรุณากรอกชื่อหอพัก" };
  if (!province || !district || !subdistrict)
    return { error: "กรุณาเลือกจังหวัด อำเภอ และตำบลให้ครบ" };
  if (!room_count) return { error: "กรุณาเลือกจำนวนห้องพัก" };
  if (!prop_status) return { error: "กรุณาเลือกสถานะหอพัก" };
  if (!first || !last) return { error: "กรุณากรอกชื่อ-นามสกุล" };
  if (!phone) return { error: "เบอร์โทรไม่ถูกต้อง (เช่น 0812345678)" };
  if (!isEmail(email)) return { error: "อีเมลไม่ถูกต้อง" };
  if (password.length < 8) return { error: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" };

  const meta = {
    full_name: `${first} ${last}`.trim(),
    org_name,
    building_type,
    room_count,
    province,
    district,
    subdistrict,
    prop_status,
    email,
    promo,
  };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({ phone, password, options: { data: meta } });

  if (error) {
    if (error.status === 429) return { error: "ขอรหัสถี่เกินไป กรุณารอสักครู่", phone };
    if (/registered|already/i.test(error.message)) {
      // อาจเป็นบัญชีที่ "สมัครค้าง" (ยังไม่ยืนยัน OTP) → ส่ง OTP ซ้ำให้สมัครต่อได้ ไม่ต้องบล็อก
      const resent = await resendOtpIfUnconfirmed(phone, password, meta);
      if (resent === "sent") return { otpSent: true, phone };
      if (resent === "confirmed")
        return { error: "เบอร์นี้มีบัญชีอยู่แล้ว — กรุณาเข้าสู่ระบบ", phone };
      // resent === "unknown": ตรวจสถานะไม่ได้ (เช่น ยังไม่ได้อัปเดต DB) → ข้อความกลาง
      return { error: "เบอร์นี้มีบัญชีอยู่แล้ว — หากยังไม่ได้รับ OTP กรุณาเข้าสู่ระบบหรือกดลืมรหัสผ่าน", phone };
    }
    return { error: error.message, phone };
  }
  return { otpSent: true, phone };
}

/**
 * บัญชีที่ signUp ไปแล้วแต่ยังไม่ยืนยันเบอร์ (phone_confirmed_at = null):
 * อัปเดตข้อมูล/รหัสผ่านล่าสุด แล้วส่ง OTP ซ้ำ เพื่อให้สมัครต่อได้
 * คืน "sent" | "confirmed" | "unknown"
 */
async function resendOtpIfUnconfirmed(
  phone: string,
  password: string,
  meta: Record<string, string>
): Promise<"sent" | "confirmed" | "unknown"> {
  try {
    const admin = createAdminClient();
    const { data: userId, error } = await admin.rpc("unconfirmed_user_id_by_phone", {
      p_phone: phone,
    });
    if (error) return "unknown"; // เช่น ยังไม่ได้รัน migration 0019
    if (!userId) return "confirmed"; // มีบัญชีแต่ยืนยันแล้ว → ให้ไปเข้าสู่ระบบ

    // รีเฟรชข้อมูล + รหัสผ่านล่าสุด (เผื่อผู้ใช้แก้ตอนสมัครรอบใหม่)
    await admin.auth.admin.updateUserById(userId as string, {
      password,
      user_metadata: meta,
    });

    const supabase = await createClient();
    const { error: otpErr } = await supabase.auth.signInWithOtp({
      phone,
      options: { channel: "sms", shouldCreateUser: false },
    });
    return otpErr ? "unknown" : "sent";
  } catch {
    return "unknown";
  }
}
