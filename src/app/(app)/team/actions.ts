"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FormState } from "@/components/action-form";

/** แปลงเบอร์ไทยให้ตรงรูปแบบที่ auth เก็บ (66xxxxxxxxx ไม่มี +) */
function normalizePhone(input: string): string | null {
  const d = input.replace(/\D/g, "");
  if (d.startsWith("0") && d.length === 10) return "66" + d.slice(1);
  if (d.startsWith("66") && d.length === 11) return d;
  return null;
}

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

  const phone = normalizePhone(String(formData.get("phone") ?? ""));
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

/** ถอดสมาชิกออกจากกิจการ (ลบบัญชีผู้ใช้ → เพิกถอนสิทธิ์ทั้งหมด) */
export async function removeMember(targetId: string): Promise<{ error?: string }> {
  const me = await currentProfile();
  if (!me) return { error: "กรุณาเข้าสู่ระบบ" };
  if (!["owner", "admin"].includes(me.role)) return { error: "ไม่มีสิทธิ์" };
  if (targetId === me.id) return { error: "ถอดตัวเองไม่ได้" };

  const admin = createAdminClient();
  const { data: target } = await admin
    .from("profiles")
    .select("id, org_id, role")
    .eq("id", targetId)
    .single();
  if (!target || target.org_id !== me.org_id) return { error: "ไม่พบสมาชิกนี้" };
  if (target.role === "owner") return { error: "ถอดเจ้าของกิจการไม่ได้" };
  if (target.role === "admin" && me.role !== "owner") return { error: "เฉพาะเจ้าของถอดแอดมินได้" };

  const { error } = await admin.auth.admin.deleteUser(targetId);
  if (error) return { error: error.message };
  revalidatePath("/team");
  return {};
}
