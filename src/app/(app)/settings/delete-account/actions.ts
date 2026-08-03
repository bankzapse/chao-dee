"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type DeleteState = { error?: string } | null;

const CONFIRM_WORD = "ลบบัญชี";

/**
 * ลบบัญชีผู้ใช้ตัวเอง (PDPA / ข้อบังคับ Apple App Store)
 *
 * - ผู้ใช้ต้องพิมพ์คำยืนยัน "ลบบัญชี" (ป้องกันการกดพลาด)
 * - ถ้าเป็น "เจ้าของ" และเป็นสมาชิกคนเดียวในองค์กร → ลบข้อมูลกิจการทั้งหมดด้วย
 *   (ลบ contracts ก่อน เพราะ FK room_id/tenant_id เป็น on delete restrict
 *    จากนั้นลบ organizations แล้ว cascade ตารางที่เหลือ)
 * - ลบ auth.users → cascade ลบ profile ของผู้ใช้เอง
 */
export async function deleteMyAccount(
  _prev: DeleteState,
  formData: FormData
): Promise<DeleteState> {
  const confirm = String(formData.get("confirm") ?? "").trim();
  if (confirm !== CONFIRM_WORD) {
    return { error: `กรุณาพิมพ์ "${CONFIRM_WORD}" เพื่อยืนยัน` };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("org_id, role")
    .eq("id", user.id)
    .maybeSingle();
  const orgId = (profile as { org_id?: string } | null)?.org_id;
  const role = (profile as { role?: string } | null)?.role;

  // เจ้าของที่เป็นสมาชิกคนเดียว → ลบข้อมูลกิจการทั้งองค์กร
  if (orgId && role === "owner") {
    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .neq("id", user.id);
    if ((count ?? 0) === 0) {
      // contracts มี FK แบบ restrict ไป rooms/tenants — ต้องลบก่อนจึงจะ cascade องค์กรได้
      await admin.from("contracts").delete().eq("org_id", orgId);
      const { error: orgErr } = await admin.from("organizations").delete().eq("id", orgId);
      if (orgErr) console.error("deleteMyAccount: ลบองค์กรไม่สำเร็จ", orgErr);
    }
  }

  // ลบบัญชีผู้ใช้ (cascade → profile ของผู้ใช้เอง)
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("deleteMyAccount: ลบผู้ใช้ไม่สำเร็จ", error);
    return { error: "ลบบัญชีไม่สำเร็จ กรุณาลองใหม่ หรือติดต่อฝ่ายช่วยเหลือ" };
  }

  await supabase.auth.signOut().catch(() => {});
  redirect("/login?deleted=1");
}
