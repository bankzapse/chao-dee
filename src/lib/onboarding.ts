import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, isEmailConfigured } from "@/lib/email";
import { welcomeEmail } from "@/lib/email-templates";

/**
 * ส่งอีเมลต้อนรับให้กิจการของผู้ใช้ "ครั้งเดียว" (best-effort)
 * เรียกหลังยืนยัน OTP สำเร็จ — ปลอดภัยแม้ยังไม่ตั้งค่าอีเมล/ยังไม่รัน migration 0042
 */
export async function sendWelcomeIfNeeded(userId: string): Promise<void> {
  if (!isEmailConfigured() || !userId) return;
  try {
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("org_id, email")
      .eq("id", userId)
      .maybeSingle();
    const orgId = (profile as { org_id?: string } | null)?.org_id;
    const email = (profile as { email?: string } | null)?.email;
    if (!orgId || !email) return;

    // เช็คธง welcome_sent (resilient ถ้ายังไม่มีคอลัมน์)
    const { data: org, error } = await admin
      .from("organizations")
      .select("name, welcome_sent")
      .eq("id", orgId)
      .maybeSingle();
    if (error) return; // 0042 ยังไม่รัน → ข้าม (ไม่เสี่ยงส่งซ้ำ)
    const row = org as { name?: string; welcome_sent?: boolean } | null;
    if (!row || row.welcome_sent) return;

    const tpl = welcomeEmail(row.name || "หอพักของคุณ");
    const res = await sendEmail({ to: email, subject: tpl.subject, html: tpl.html });
    if (res.ok) {
      await admin.from("organizations").update({ welcome_sent: true }).eq("id", orgId);
    }
  } catch {
    // best-effort — ไม่ขวางการล็อกอิน
  }
}
