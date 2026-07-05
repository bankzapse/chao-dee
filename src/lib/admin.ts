import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** ตรวจว่าเป็นผู้ดูแลแพลตฟอร์ม (ทีม Chao-Dee) ไม่ใช่ → เด้งกลับแดชบอร์ด */
export async function requirePlatformAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/owner-login");

  const { data } = await supabase
    .from("profiles")
    .select("is_platform_admin")
    .eq("id", user.id)
    .single();

  if (!data?.is_platform_admin) redirect("/dashboard");
  return user.id;
}

export async function isPlatformAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("profiles")
    .select("is_platform_admin")
    .eq("id", user.id)
    .single();
  return Boolean(data?.is_platform_admin);
}
