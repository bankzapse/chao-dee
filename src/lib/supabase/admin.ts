import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client แบบ service-role — ใช้เฉพาะฝั่งเซิร์ฟเวอร์ที่ไม่มี session ผู้ใช้
 * (เช่น LINE webhook) — บายพาส RLS จึงต้องระวังการใช้งาน
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
