import { createAdminClient } from "@/lib/supabase/admin";

/**
 * เวอร์ชันข้อกำหนดการใช้งาน + นโยบายความเป็นส่วนตัวปัจจุบัน
 * เพิ่มค่านี้เมื่อแก้เนื้อหา /terms หรือ /privacy — ผู้ใช้เดิมจะถูกบันทึกยินยอมเวอร์ชันใหม่อีกครั้ง
 */
export const CONSENT_VERSION = "2026-08";

/**
 * บันทึกการยินยอมข้อกำหนด+นโยบายความเป็นส่วนตัว (PDPA proof-of-consent)
 *
 * เรียกตอนผู้ใช้ยืนยันเบอร์สำเร็จ (verifyOtp) — idempotent ต่อ (user, kind, version)
 * best-effort: บันทึกไม่สำเร็จต้องไม่ขวาง flow สมัคร/ล็อกอิน
 */
export async function recordConsent(
  userId: string,
  ip?: string,
  kind = "terms_privacy",
  version = CONSENT_VERSION
): Promise<void> {
  try {
    const admin = createAdminClient();
    // upsert + ignoreDuplicates: บันทึกครั้งเดียวต่อเวอร์ชัน (unique user_id,kind,version)
    await admin
      .from("user_consents")
      .upsert(
        { user_id: userId, kind, version, ip: ip ?? null },
        { onConflict: "user_id,kind,version", ignoreDuplicates: true }
      );
  } catch (e) {
    console.warn("recordConsent failed:", e);
  }
}
