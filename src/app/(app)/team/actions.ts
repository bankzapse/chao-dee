"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { toE164Digits, toLocalThai } from "@/lib/phone";
import { logAudit } from "@/lib/audit";
import { allPermissionKeys } from "@/lib/permissions";
import type { FormState } from "@/components/action-form";

/** อีเมลสังเคราะห์ภายในสำหรับบัญชีทีมงาน (ไม่เคยส่งเมลจริง) */
const TEAM_EMAIL_DOMAIN = "team.chao-dee.app";

/** ดึงโปรไฟล์ผู้เรียก (id, org, role) */
async function currentProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, org_id, role")
    .eq("id", user.id)
    .single();
  return data ? { ...data, supabase } : null;
}

/** เชิญทีมงานด้วยเบอร์โทร (เฉพาะเจ้าของ/แอดมิน) */
export async function inviteMember(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await currentProfile();
  if (!me) return { error: "กรุณาเข้าสู่ระบบ" };
  if (!["owner", "admin"].includes(me.role)) return { error: "คุณไม่มีสิทธิ์เชิญทีมงาน" };

  const phone = toE164Digits(String(formData.get("phone") ?? ""));
  if (!phone) return { error: "เบอร์โทรไม่ถูกต้อง (เช่น 0812345678)" };
  const full_name = String(formData.get("full_name") ?? "").trim();
  const role = String(formData.get("role") ?? "staff") === "admin" ? "admin" : "staff";

  // มีสมาชิกใช้เบอร์นี้ในกิจการอยู่แล้วหรือยัง
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("org_id", me.org_id)
    .eq("phone", phone)
    .maybeSingle();
  if (existing) return { error: "เบอร์นี้เป็นสมาชิกในกิจการอยู่แล้ว" };

  const { error } = await me.supabase.from("invitations").insert({
    org_id: me.org_id,
    phone,
    full_name,
    role,
    invited_by: me.id,
  });
  if (error) {
    if (error.code === "23505") return { error: "เบอร์นี้ถูกเชิญไว้แล้ว (รอผู้ใช้สมัคร)" };
    return { error: error.message };
  }
  await logAudit({
    org_id: me.org_id,
    actor_id: me.id,
    action: "เชิญทีมงาน",
    target: toLocalThai(phone),
    meta: { role },
  });
  revalidatePath("/team");
  return { ok: true };
}

/** ยกเลิกคำเชิญ */
export async function revokeInvitation(id: string): Promise<void> {
  const me = await currentProfile();
  if (!me || !["owner", "admin"].includes(me.role)) return;
  await me.supabase
    .from("invitations")
    .update({ status: "revoked" })
    .eq("id", id)
    .eq("status", "pending");
  revalidatePath("/team");
}

/** ต้องเป็นเจ้าของกิจการ (การจัดการ role/บัญชีทีมงานทำได้เฉพาะเจ้าของ) */
async function requireOwner() {
  const me = await currentProfile();
  return me && me.role === "owner" ? me : null;
}

/** กรอง permission ที่ส่งมาให้เหลือเฉพาะ key ที่มีจริงใน catalog */
function cleanPerms(raw: FormDataEntryValue[]): string[] {
  const valid = new Set(allPermissionKeys());
  return [...new Set(raw.map(String).filter((p) => valid.has(p)))];
}

/** สร้างประเภททีมงาน (role) พร้อมกำหนดสิทธิ์ — เฉพาะเจ้าของ */
export async function createRole(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await requireOwner();
  if (!me) return { error: "เฉพาะเจ้าของกิจการเท่านั้น" };
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "กรุณาตั้งชื่อประเภททีมงาน" };
  const permissions = cleanPerms(formData.getAll("perms"));

  const { error } = await me.supabase
    .from("roles")
    .insert({ org_id: me.org_id, name, permissions });
  if (error) {
    if (error.code === "23505") return { error: "มีประเภทชื่อนี้อยู่แล้ว" };
    return { error: error.message };
  }
  await logAudit({ org_id: me.org_id, actor_id: me.id, action: "สร้างประเภททีมงาน", target: name, meta: { permissions } });
  revalidatePath("/team");
  return { ok: true };
}

/** แก้ไขชื่อ/สิทธิ์ของ role — เฉพาะเจ้าของ */
export async function updateRole(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const me = await requireOwner();
  if (!me) return { error: "เฉพาะเจ้าของกิจการเท่านั้น" };
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "กรุณาตั้งชื่อประเภททีมงาน" };
  const permissions = cleanPerms(formData.getAll("perms"));

  const { error } = await me.supabase
    .from("roles")
    .update({ name, permissions })
    .eq("id", id)
    .eq("org_id", me.org_id);
  if (error) {
    if (error.code === "23505") return { error: "มีประเภทชื่อนี้อยู่แล้ว" };
    return { error: error.message };
  }
  revalidatePath("/team");
  return { ok: true };
}

/** ลบ role — สมาชิกที่ใช้ role นี้ role_id จะเป็น null (สิทธิ์หายจนกว่าเจ้าของกำหนดใหม่) */
export async function deleteRole(id: string): Promise<{ error?: string }> {
  const me = await requireOwner();
  if (!me) return { error: "เฉพาะเจ้าของกิจการเท่านั้น" };
  const { error } = await me.supabase.from("roles").delete().eq("id", id).eq("org_id", me.org_id);
  if (error) return { error: error.message };
  revalidatePath("/team");
  return {};
}

/** สร้างบัญชีทีมงาน (username + รหัสผ่าน + role) — เฉพาะเจ้าของ */
export async function createTeamMember(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await requireOwner();
  if (!me) return { error: "เฉพาะเจ้าของกิจการเท่านั้น" };

  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const full_name = String(formData.get("full_name") ?? "").trim();
  const roleId = String(formData.get("role_id") ?? "").trim() || null;

  if (!/^[a-z0-9_.]{3,20}$/.test(username)) return { error: "ชื่อผู้ใช้ต้องเป็น a-z, 0-9, _ . ยาว 3-20 ตัว" };
  if (password.length < 6) return { error: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" };
  if (!full_name) return { error: "กรุณากรอกชื่อทีมงาน" };

  const admin = createAdminClient();
  const { data: dupe } = await admin.from("profiles").select("id").eq("username", username).maybeSingle();
  if (dupe) return { error: "ชื่อผู้ใช้นี้ถูกใช้แล้ว" };

  const email = `${username}@${TEAM_EMAIL_DOMAIN}`;
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });
  if (cErr || !created?.user) {
    if (cErr && /already|registered|exists/i.test(cErr.message)) return { error: "ชื่อผู้ใช้นี้ถูกใช้แล้ว" };
    return { error: cErr?.message ?? "สร้างบัญชีไม่สำเร็จ" };
  }
  const newUserId = created.user.id;

  // trigger handle_new_user สร้าง org ใหม่ + profile(role=owner) ให้ทุกครั้งที่สร้าง auth user
  // *ห้าม* ใช้ UPDATE ย้าย org/ตั้ง username — เพราะ BEFORE UPDATE guard (0053) pin คอลัมน์สิทธิ์ทิ้ง
  // → ลบ profile+org ชั่วคราวก่อน แล้ว INSERT profile ใหม่ให้ตรง (INSERT ไม่โดน guard)
  const { data: autoProfile } = await admin.from("profiles").select("org_id").eq("id", newUserId).maybeSingle();
  const throwawayOrg = (autoProfile as { org_id?: string } | null)?.org_id;

  await admin.from("profiles").delete().eq("id", newUserId); // ลบ profile(owner) ที่ trigger สร้าง
  if (throwawayOrg && throwawayOrg !== me.org_id) {
    await admin.from("organizations").delete().eq("id", throwawayOrg); // ลบ org ว่างที่ trigger สร้าง
  }

  const { error: insErr } = await admin.from("profiles").insert({
    id: newUserId,
    org_id: me.org_id,
    role: "staff",
    role_id: roleId,
    username,
    full_name,
  });
  if (insErr) {
    await admin.auth.admin.deleteUser(newUserId).catch(() => null); // rollback กันบัญชีค้าง
    return { error: insErr.message };
  }

  await logAudit({ org_id: me.org_id, actor_id: me.id, action: "สร้างบัญชีทีมงาน", target: username, meta: { role_id: roleId } });
  revalidatePath("/team");
  return { ok: true };
}

/** ถอดสมาชิกออกจากกิจการ (ลบบัญชีผู้ใช้ → เพิกถอนสิทธิ์ทั้งหมด) */
export async function removeMember(targetId: string): Promise<{ error?: string }> {
  const me = await currentProfile();
  if (!me) return { error: "กรุณาเข้าสู่ระบบ" };
  if (!["owner", "admin"].includes(me.role)) return { error: "ไม่มีสิทธิ์" };
  if (targetId === me.id) return { error: "ถอดตัวเองไม่ได้" };

  const admin = createAdminClient();
  const { data: target } = await admin
    .from("profiles")
    .select("id, org_id, role, phone")
    .eq("id", targetId)
    .single();
  if (!target || target.org_id !== me.org_id) return { error: "ไม่พบสมาชิกนี้" };
  if (target.role === "owner") return { error: "ถอดเจ้าของกิจการไม่ได้" };
  if (target.role === "admin" && me.role !== "owner") return { error: "เฉพาะเจ้าของถอดแอดมินได้" };

  const { error } = await admin.auth.admin.deleteUser(targetId);
  if (error) return { error: error.message };
  await logAudit({
    org_id: me.org_id,
    actor_id: me.id,
    action: "ถอดสมาชิกออกจากทีม",
    target: toLocalThai(target.phone ?? ""),
    meta: { role: target.role },
  });
  revalidatePath("/team");
  return {};
}
