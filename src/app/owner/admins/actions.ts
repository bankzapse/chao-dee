"use server";

import { requireOwner } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import { toE164, toLocalThai } from "@/lib/phone";
import { ADMIN_SECTIONS } from "@/lib/admin-sections";
import type { FormState } from "@/components/action-form";

const VALID_PERMS = new Set<string>(ADMIN_SECTIONS.map((s) => s.key));

/** owner สร้างบัญชีแอดมินใหม่ (เบอร์ + รหัสผ่าน) + กำหนดสิทธิ์ */
export async function createAdmin(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireOwner();
  const full_name = String(formData.get("full_name") ?? "").trim();
  const phoneRaw = String(formData.get("phone") ?? "");
  const phone = toE164(phoneRaw);
  const password = String(formData.get("password") ?? "");
  const perms = formData.getAll("perms").map(String).filter((p) => VALID_PERMS.has(p));

  if (!full_name) return { error: "กรุณากรอกชื่อแอดมิน" };
  if (!phone) return { error: "เบอร์โทรไม่ถูกต้อง (เช่น 0812345678)" };
  if (password.length < 8) return { error: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" };

  const admin = createAdminClient();
  // สร้างบัญชีเข้าระบบ (ยืนยันเบอร์ทันที) — trigger จะสร้าง profile ให้
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    phone,
    password,
    phone_confirm: true,
    user_metadata: { full_name },
  });
  if (cErr || !created?.user) {
    if (cErr && /already|registered|exists/i.test(cErr.message))
      return { error: "เบอร์นี้มีบัญชีอยู่แล้ว" };
    return { error: cErr?.message ?? "สร้างบัญชีไม่สำเร็จ" };
  }

  // ตั้งเป็นแอดมิน (จำกัดสิทธิ์ตามที่เลือก)
  const { error } = await admin
    .from("profiles")
    .update({
      full_name,
      phone: toLocalThai(phone),
      is_platform_admin: true,
      admin_role: "admin",
      admin_perms: perms,
    })
    .eq("id", created.user.id);
  if (error) return { error: error.message };

  await logAudit({ org_id: null, actor_id: created.user.id, action: "สร้างแอดมิน", target: full_name, meta: { perms } });
  return { ok: true };
}

/** owner แก้สิทธิ์ของแอดมิน */
export async function updateAdminPerms(userId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireOwner();
  const perms = formData.getAll("perms").map(String).filter((p) => VALID_PERMS.has(p));
  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ admin_perms: perms }).eq("id", userId).eq("admin_role", "admin");
  if (error) return { error: error.message };
  return { ok: true };
}

/** owner ลบแอดมิน (ลบบัญชีเข้าระบบ) — ลบได้เฉพาะ role 'admin' เท่านั้น */
export async function deleteAdmin(userId: string): Promise<void> {
  await requireOwner();
  const admin = createAdminClient();
  const { data: p } = await admin
    .from("profiles")
    .select("admin_role, full_name")
    .eq("id", userId)
    .maybeSingle();
  if (!p || p.admin_role !== "admin") return; // กันลบ owner
  await admin.auth.admin.deleteUser(userId).catch(() => null);
  await logAudit({ org_id: null, actor_id: userId, action: "ลบแอดมิน", target: p.full_name ?? userId });
}
