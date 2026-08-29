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

  // เลือก role เดี่ยว ๆ ก่อน (คอลัมน์เดิม มีเสมอ) — กันแอปล่มถ้า migration 0053 ยังไม่รันบน prod
  const { data: base } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!base) return null;
  if (base.role === "owner" || base.role === "admin") return fullAccess(base.role);

  // staff: อ่าน role_id + permissions แบบทนทาน (ถ้าคอลัมน์/ตารางยังไม่มี → ถือว่าไม่มีสิทธิ์)
  let permissions: string[] = [];
  const { data: p } = await supabase.from("profiles").select("role_id").eq("id", user.id).maybeSingle();
  const roleId = (p as { role_id?: string } | null)?.role_id;
  if (roleId) {
    const { data: role } = await supabase.from("roles").select("permissions").eq("id", roleId).maybeSingle();
    permissions = (role?.permissions as string[] | undefined) ?? [];
  }
  return { role: base.role, isOwner: false, permissions };
}

/** เช็คสิทธิ์ 1 key ของผู้ใช้ปัจจุบัน (ใช้ gate server action) — owner/admin ผ่านเสมอ */
export async function can(key: string): Promise<boolean> {
  return hasPermission(await getMyAccess(), key);
}

/**
 * การ์ดหน้าโมดูล: ถ้าไม่มีสิทธิ์ "<module>:view" → เด้งกลับ dashboard
 * ใช้บนสุดของ page ที่เป็นโมดูล (owner/admin ผ่านเสมอ)
 */
export async function requireModuleView(moduleKey: string): Promise<void> {
  const access = await getMyAccess();
  if (!hasPermission(access, `${moduleKey}:view`)) redirect("/dashboard");
}
