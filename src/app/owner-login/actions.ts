"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, sweepIfNeeded } from "@/lib/rate-limit";

export type OwnerAuthState = { error?: string } | null;

/** แปลงเบอร์ไทยเป็น E.164 (+66...) */
function toE164(input: string): string | null {
  const d = input.replace(/\D/g, "");
  if (d.startsWith("0") && d.length === 10) return "+66" + d.slice(1);
  if (d.startsWith("66") && d.length === 11) return "+" + d;
  if (input.startsWith("+") && d.length >= 11) return "+" + d;
  return null;
}

/** เข้าสู่ระบบแผงเจ้าของด้วยเบอร์ + รหัสผ่าน (ไม่ใช้ OTP) */
export async function ownerLogin(
  _prev: OwnerAuthState,
  formData: FormData
): Promise<OwnerAuthState> {
  const phone = toE164(String(formData.get("phone") ?? ""));
  const password = String(formData.get("password") ?? "");
  if (!phone) return { error: "เบอร์โทรไม่ถูกต้อง" };
  if (!password) return { error: "กรุณากรอกรหัสผ่าน" };

  // กัน brute-force รหัสผ่าน (5 ครั้ง/นาที ต่อเบอร์)
  sweepIfNeeded();
  const rl = rateLimit(`owner-login:${phone}`, 5, 60_000);
  if (!rl.ok) return { error: `พยายามเข้าสู่ระบบบ่อยเกินไป ลองใหม่ใน ${rl.retryAfter} วินาที` };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ phone, password });
  if (error || !data.user) return { error: "เบอร์หรือรหัสผ่านไม่ถูกต้อง" };

  // อนุญาตเฉพาะผู้ดูแลแพลตฟอร์ม
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_platform_admin")
    .eq("id", data.user.id)
    .single();

  if (!profile?.is_platform_admin) {
    await supabase.auth.signOut();
    return { error: "บัญชีนี้ไม่มีสิทธิ์เข้าแผงเจ้าของระบบ" };
  }

  redirect("/owner");
}
