/**
 * Rate limiter แบบ in-memory (fixed window) สำหรับกันการยิงถี่
 * หมายเหตุ: บน serverless จะแยกตาม instance — ใช้เป็นชั้นป้องกันเสริม
 * โดยด่านหลักคือการตรวจ auth/signature ของแต่ละ route
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const b = buckets.get(key);

  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }

  if (b.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
  }

  b.count++;
  return { ok: true, retryAfter: 0 };
}

// เก็บกวาด bucket ที่หมดอายุเป็นระยะ กันหน่วยความจำโต
let lastSweep = 0;
export function sweepIfNeeded() {
  const now = Date.now();
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, v] of buckets) if (now >= v.resetAt) buckets.delete(k);
}
