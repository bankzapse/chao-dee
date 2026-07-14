"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, sweepIfNeeded } from "@/lib/rate-limit";
import { rateLimitDb } from "@/lib/rate-limit-db";
import { toE164 } from "@/lib/phone";

export type OwnerAuthState = { error?: string } | null;

/** เข้าสู่ระบบแผงเจ้าของด้วยเบอร์ + รหัสผ่าน (ไม่ใช้ OTP) */
export async function ownerLogin(
  _prev: OwnerAuthState,
  formData: FormData
): Promise<OwnerAuthState> {
  const phone = toE164(String(formData.get("phone") ?? ""));
  const password = String(formData.get("password") ?? "");
  if (!phone) return { error: "เบอร์โทรไม่ถูกต้อง" };
  if (!password) return { error: "กรุณากรอกรหัสผ่าน" };

  // กัน brute-force รหัสผ่าน (5 ครั้ง/นาที ต่อเบอร์) — ชั้น in-memory + durable (ข้าม instance)
  sweepIfNeeded();
  const rl = rateLimit(`owner-login:${phone}`, 5, 60_000);
  if (!rl.ok) return { error: `พยายามเข้าสู่ระบบบ่อยเกินไป ลองใหม่ใน ${rl.retryAfter} วินาที` };
  const rlDb = await rateLimitDb(`owner-login:${phone}`, 5, 60_000);
  if (!rlDb.ok) return { error: `พยายามเข้าสู่ระบบบ่อยเกินไป ลองใหม่ใน ${rlDb.retryAfter} วินาที` };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ phone, password });
  if (error || !data.user) return { error: "เบอร์หรือรหัสผ่านไม่ถูกต้อง" };

  // อนุญาตเฉพาะผู้ดูแลแพลตฟอร์ม — เช็คผ่าน service-role เพื่อไม่ให้ติด RLS/จังหวะ session
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("is_platform_admin")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile?.is_platform_admin) {
    await supabase.auth.signOut();
    return { error: "บัญชีนี้ไม่มีสิทธิ์เข้าแผงเจ้าของระบบ" };
  }

  redirect("/owner");
}
