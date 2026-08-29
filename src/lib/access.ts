import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { type Access, fullAccess, hasPermission } from "@/lib/permissions";

/**
 * โหลดสิทธิ์ของผู้ใช้ที่ล็อกอินอยู่ (server เท่านั้น)
 * - owner / admin → สิทธิ์เต็ม (admin เดิมยังทำงานได้เหมือนก่อนมี custom role)
 * - staff + role_id → สิทธิ์ตาม roles.permissions
 * - staff ไม่มี role_id → ไม่มีสิทธิ์อะไร (นอกจาก dashboard พื้นฐาน)
 */
export async function getMyAccess(): Promise<Access | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, role_id")
    .eq("id", user.id)
    .single();
  if (!profile) return null;

  if (profile.role === "owner" || profile.role === "admin") return fullAccess(profile.role);

  let permissions: string[] = [];
  if (profile.role_id) {
    const { data: role } = await supabase
      .from("roles")
      .select("permissions")
      .eq("id", profile.role_id)
      .maybeSingle();
    permissions = (role?.permissions as string[] | undefined) ?? [];
  }
  return { role: profile.role, isOwner: false, permissions };
}

/**
 * การ์ดหน้าโมดูล: ถ้าไม่มีสิทธิ์ "<module>:view" → เด้งกลับ dashboard
 * ใช้บนสุดของ page ที่เป็นโมดูล (owner/admin ผ่านเสมอ)
 */
export async function requireModuleView(moduleKey: string): Promise<void> {
  const access = await getMyAccess();
  if (!hasPermission(access, `${moduleKey}:view`)) redirect("/dashboard");
}
