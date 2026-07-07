import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export { ADMIN_SECTIONS } from "@/lib/admin-sections";

export type AdminRole = "owner" | "admin";
export type AdminContext = { userId: string; role: AdminRole; perms: string[] };

type AdminRow = { is_platform_admin: boolean | null; admin_role: string | null; admin_perms: string[] | null };

/** อ่านสิทธิ์แอดมินผ่าน service-role (bypass RLS) — resilient ถ้ายังไม่มีคอลัมน์ใหม่ */
async function readAdmin(userId: string): Promise<AdminContext | null> {
  const admin = createAdminClient();
  let row: AdminRow | null = null;
  const full = await admin
    .from("profiles")
    .select("is_platform_admin, admin_role, admin_perms")
    .eq("id", userId)
    .maybeSingle();
  if (full.error) {
    // ยังไม่ได้รัน migration 0022 → อ่านแค่ is_platform_admin
    const basic = await admin.from("profiles").select("is_platform_admin").eq("id", userId).maybeSingle();
    row = basic.data ? { ...(basic.data as { is_platform_admin: boolean }), admin_role: null, admin_perms: null } : null;
  } else {
    row = full.data as AdminRow | null;
  }
  if (!row?.is_platform_admin) return null;
  const role: AdminRole = row.admin_role === "admin" ? "admin" : "owner";
  return { userId, role, perms: row.admin_perms ?? [] };
}

async function currentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** ตรวจว่าเป็นผู้ดูแลแพลตฟอร์ม (owner หรือ admin) — ไม่ใช่ → เด้งออก */
export async function requirePlatformAdmin(): Promise<string> {
  const uid = await currentUserId();
  if (!uid) redirect("/owner-login");
  const ctx = await readAdmin(uid);
  if (!ctx) redirect("/dashboard");
  return uid;
}

/** ดึง context สิทธิ์ (role + perms) ของแอดมินที่ล็อกอิน */
export async function getAdminContext(): Promise<AdminContext> {
  const uid = await currentUserId();
  if (!uid) redirect("/owner-login");
  const ctx = await readAdmin(uid);
  if (!ctx) redirect("/dashboard");
  return ctx;
}

/** บังคับว่าต้องมีสิทธิ์เข้าถึง section นั้น (owner เข้าได้ทุกหน้า) */
export async function requirePerm(section: string): Promise<AdminContext> {
  const ctx = await getAdminContext();
  if (ctx.role !== "owner" && !ctx.perms.includes(section)) redirect("/owner");
  return ctx;
}

/** owner เท่านั้น (เช่น หน้าจัดการแอดมิน) */
export async function requireOwner(): Promise<AdminContext> {
  const ctx = await getAdminContext();
  if (ctx.role !== "owner") redirect("/owner");
  return ctx;
}

export async function isPlatformAdmin(): Promise<boolean> {
  const uid = await currentUserId();
  if (!uid) return false;
  return Boolean(await readAdmin(uid));
}
