import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Rate limiter แบบ durable (เก็บใน Postgres) — ใช้ได้ข้าม serverless instance
 * fail-open: ถ้า RPC มีปัญหา/ยังไม่ได้รัน migration 0040 → ปล่อยผ่าน (ยังมี in-memory เป็นชั้นเสริมได้)
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
    if (error || !data) return { ok: true, retryAfter: 0 };
    const row = Array.isArray(data) ? data[0] : data;
    return { ok: Boolean(row?.allowed), retryAfter: Number(row?.retry_after ?? 0) };
  } catch {
    return { ok: true, retryAfter: 0 };
  }
}
