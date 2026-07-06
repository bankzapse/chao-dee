"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { toE164 } from "@/lib/phone";

export type SignupValues = {
  org_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  promo?: string;
  phone?: string;
  province?: string;
  district?: string;
  subdistrict?: string;
  room_count?: string;
  prop_status?: string;
  building_type?: string;
};

export type SignupState = {
  error?: string;
  /** ชื่อฟิลด์ที่ผิด เพื่อให้ผู้ใช้แก้เฉพาะจุด */
  field?: string;
  otpSent?: boolean;
  phone?: string;
  /** ค่าที่กรอกไว้ ส่งกลับเพื่อคงข้อมูลในฟอร์มเมื่อสมัครไม่สำเร็จ */
  values?: SignupValues;
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
  const rawPhone = g("phone");
  const phone = toE164(rawPhone);

  // เก็บค่าที่กรอกไว้ทั้งหมด เพื่อคงข้อมูลในฟอร์มเมื่อ error (แก้เฉพาะจุดที่ผิด)
  const values: SignupValues = {
    org_name, first_name: first, last_name: last, email, promo, phone: rawPhone,
    province, district, subdistrict, room_count, prop_status, building_type,
  };
  const fail = (error: string, field?: string): SignupState => ({ error, field, phone: phone ?? undefined, values });

  // ตรวจความครบถ้วน (ตามฟิลด์บังคับ *)
  if (!org_name) return fail("กรุณากรอกชื่อหอพัก", "org_name");
  if (!province || !district || !subdistrict)
    return fail("กรุณาเลือกจังหวัด อำเภอ และตำบลให้ครบ", "province");
  if (!room_count) return fail("กรุณาเลือกจำนวนห้องพัก", "room_count");
  if (!prop_status) return fail("กรุณาเลือกสถานะหอพัก", "prop_status");
  if (!first || !last) return fail("กรุณากรอกชื่อ-นามสกุล", "first_name");
  if (!phone) return fail("เบอร์โทรไม่ถูกต้อง (เช่น 0812345678)", "phone");
  if (!isEmail(email)) return fail("อีเมลไม่ถูกต้อง", "email");
  if (password.length < 8) return fail("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร", "password");

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
    if (error.status === 429) return fail("ขอรหัสถี่เกินไป กรุณารอสักครู่");
    if (/registered|already/i.test(error.message)) {
      // อาจเป็นบัญชีที่ "สมัครค้าง" (ยังไม่ยืนยัน OTP) → ส่ง OTP ซ้ำให้สมัครต่อได้ ไม่ต้องบล็อก
      const resent = await resendOtpIfUnconfirmed(phone, password, meta);
      if (resent === "sent") return { otpSent: true, phone };
      if (resent === "confirmed")
        return fail("เบอร์นี้มีบัญชีอยู่แล้ว — กรุณาเข้าสู่ระบบ", "phone");
      // resent === "unknown": ตรวจสถานะไม่ได้ (เช่น ยังไม่ได้อัปเดต DB) → ข้อความกลาง
      return fail("เบอร์นี้มีบัญชีอยู่แล้ว — หากยังไม่ได้รับ OTP กรุณาเข้าสู่ระบบหรือกดลืมรหัสผ่าน", "phone");
    }
    return fail(error.message);
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
