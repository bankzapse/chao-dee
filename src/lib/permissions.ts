import { createClient } from "@/lib/supabase/server";

/**
 * Custom RBAC — permission catalog + helper (บังคับสิทธิ์ชั้น app-layer)
 *
 * รูปแบบ key = "<module>:<action>" เช่น "invoices:edit"
 * - owner = สิทธิ์เต็มโดยปริยาย (hasPermission คืน true เสมอ)
 * - ทีมงาน custom role = ได้เฉพาะ key ที่อยู่ใน roles.permissions[]
 * - การจัดการทีม/สิทธิ์ (team, roles) = เฉพาะเจ้าของ ไม่อยู่ใน catalog นี้ (ไม่ delegate)
 */

export type PermAction = "view" | "create" | "edit" | "delete";

export const ACTION_LABEL: Record<PermAction, string> = {
  view: "ดู",
  create: "เพิ่ม",
  edit: "แก้ไข",
  delete: "ลบ",
};

export type PermModule = { key: string; label: string; actions: PermAction[] };

/** โมดูลที่มอบสิทธิ์ให้ทีมงานได้ (อิงหน้าจริงใน (app)) */
export const PERMISSION_MODULES: PermModule[] = [
  { key: "tenants", label: "ผู้เช่า", actions: ["view", "create", "edit", "delete"] },
  { key: "rooms", label: "ห้องพัก", actions: ["view", "create", "edit", "delete"] },
  { key: "buildings", label: "อาคาร/สาขา", actions: ["view", "create", "edit", "delete"] },
  { key: "contracts", label: "สัญญาเช่า", actions: ["view", "create", "edit", "delete"] },
  { key: "invoices", label: "บิล/ใบแจ้งหนี้", actions: ["view", "create", "edit", "delete"] },
  { key: "fees", label: "ค่าบริการ/ค่าธรรมเนียม", actions: ["view", "edit"] },
  { key: "expenses", label: "ค่าใช้จ่าย", actions: ["view", "create", "edit", "delete"] },
  { key: "meters", label: "มิเตอร์ (น้ำ/ไฟ)", actions: ["view", "edit"] },
  { key: "maintenance", label: "แจ้งซ่อม", actions: ["view", "edit", "delete"] },
  { key: "parcels", label: "พัสดุ", actions: ["view", "create", "edit", "delete"] },
  { key: "announcements", label: "ประกาศ", actions: ["view", "create", "edit", "delete"] },
  { key: "reports", label: "รายงาน", actions: ["view"] },
  { key: "agency", label: "นายหน้า/ฝากปล่อย", actions: ["view", "edit"] },
  { key: "settings", label: "ตั้งค่ากิจการ", actions: ["view", "edit"] },
];

/** รายการ permission key ทั้งหมดที่มอบได้ (เช่น ["tenants:view", ...]) */
export function allPermissionKeys(): string[] {
  return PERMISSION_MODULES.flatMap((m) => m.actions.map((a) => `${m.key}:${a}`));
}

/** สิทธิ์ของผู้ใช้ปัจจุบัน (โหลดครั้งเดียวแล้วส่งต่อ) */
export type Access = {
  role: string; // enum ฐาน: owner/admin/staff
  isOwner: boolean;
  permissions: string[]; // key ละเอียดจาก custom role (owner = ครบทุก key)
};

/** owner มีสิทธิ์เต็ม · admin (เดิม) ถือว่าสิทธิ์เต็มเช่นกันเพื่อความเข้ากันได้ย้อนหลัง */
function fullAccess(role: string): Access {
  return { role, isOwner: role === "owner", permissions: allPermissionKeys() };
}

/**
 * โหลดสิทธิ์ของผู้ใช้ที่ล็อกอินอยู่
 * - owner / admin → สิทธิ์เต็ม (admin เดิมยังทำงานได้เหมือนก่อนมี custom role)
 * - staff + role_id → สิทธิ์ตาม roles.permissions
 * - staff ไม่มี role_id → ไม่มีสิทธิ์อะไร (นอกจากหน้า dashboard พื้นฐาน)
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

/** เช็คสิทธิ์ 1 key (owner/admin ผ่านเสมอ) */
export function hasPermission(access: Access | null, key: string): boolean {
  if (!access) return false;
  if (access.isOwner || access.role === "admin") return true;
  return access.permissions.includes(key);
}

/** เช็คว่ามีสิทธิ์อย่างน้อย 1 action ในโมดูล (เช่น โชว์เมนูไหม) */
export function canAccessModule(access: Access | null, moduleKey: string): boolean {
  if (!access) return false;
  if (access.isOwner || access.role === "admin") return true;
  return access.permissions.some((p) => p.startsWith(`${moduleKey}:`));
}
