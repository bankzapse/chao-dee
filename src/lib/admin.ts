import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** อ่าน flag ผ่าน service-role (bypass RLS) เพื่อไม่ให้ติด policy/จังหวะ session */
async function readPlatformAdmin(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("is_platform_admin")
    .eq("id", userId)
    .maybeSingle();
  return Boolean(data?.is_platform_admin);
}

/** ตรวจว่าเป็นผู้ดูแลแพลตฟอร์ม (ทีม Chao-Dee) ไม่ใช่ → เด้งกลับแดชบอร์ด */
export async function requirePlatformAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/owner-login");

  if (!(await readPlatformAdmin(user.id))) redirect("/dashboard");
  return user.id;
}

export async function isPlatformAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  return readPlatformAdmin(user.id);
}
