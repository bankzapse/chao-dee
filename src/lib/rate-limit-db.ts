import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Rate limiter แบบ durable (เก็บใน Postgres) — ใช้ได้ข้าม serverless instance
 *
 * ตัดสินใจ (ข้อ 6): คง "fail-open" ไว้โดยตั้งใจ
 *   - นี่เป็น "ชั้นเสริม" ที่ทำงานคู่กับ in-memory rateLimit() (ชั้นหลัก ต่อ instance)
 *     ถ้า DB/RPC สะดุด in-memory ยังกัน brute-force ต่อ instance อยู่
 *   - ถ้า fail-closed แล้ว DB มีปัญหาชั่วคราว จะบล็อกผู้ใช้ที่ถูกต้อง "ทุกคน" ออกจากระบบ
 *     (availability เสียหนักกว่าที่ได้)
 *   - แลกกับ: ต้อง "ดังพอให้รู้" ว่ามันหลุด → log ทุกครั้งที่ fail-open (ด้านล่าง)
 *     ผู้ดูแลต้องเฝ้า log นี้ ถ้าเห็นบ่อย = DB/มิเทเรชัน 0040 มีปัญหา
 *
 * หมายเหตุ: เส้นทาง auth ที่ต้องการความเข้มจริง ๆ ควรมี in-memory rateLimit() ประกบเสมอ
 */
export async function rateLimitDb(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ ok: boolean; retryAfter: number }> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("rate_limit_hit", {
      p_key: key,
      p_limit: limit,
      p_window_ms: windowMs,
    });
    if (error) {
      // เช่น ยังไม่ได้รัน migration 0040 หรือ RPC ล้ม → fail-open + log
      console.warn(`[rate-limit-db] fail-open (rpc error) key=${key}: ${error.message}`);
      return { ok: true, retryAfter: 0 };
    }
    if (!data) {
      console.warn(`[rate-limit-db] fail-open (no data) key=${key}`);
      return { ok: true, retryAfter: 0 };
    }
    const row = Array.isArray(data) ? data[0] : data;
    return { ok: Boolean(row?.allowed), retryAfter: Number(row?.retry_after ?? 0) };
  } catch (e) {
    console.warn(`[rate-limit-db] fail-open (exception) key=${key}: ${(e as Error).message}`);
    return { ok: true, retryAfter: 0 };
  }
}
