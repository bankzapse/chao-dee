/* ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ ไฟล์นี้ถูก generate อัตโนมัติ — ห้ามแก้ที่นี่ (แก้แล้วจะถูกทับรอบ sync ถัดไป)
 *
 * ต้นทาง : micro-services/packages/core/src/line-oa.ts
 * วิธีแก้ : แก้ที่ต้นทาง → รัน `npm test` แล้ว `npm run sync` ใน repo micro-services
 *          → commit ไฟล์ที่เปลี่ยนใน repo นี้ด้วย
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * LINE Official Account — ตัวช่วย pure (ใช้ได้ทั้ง server/client)
 *
 * ── สถานะการรวม ──────────────────────────────────────────────────────────
 * ที่มา: chao-dee/src/lib/line-oa.ts (เฉพาะส่วน pure)
 *
 * ⚠️ ตัว OA id เอง (@epe8275f ของ ChaoDee, @200iyzrg ของถุงเขียว) ไม่ย้ายมาที่นี่
 *    เพราะเป็น "ค่าของแอป" ไม่ใช่ logic — แต่ละแอปเก็บ constant ของตัวเองไว้เหมือนเดิม
 *    (thung-kheow-service/src/lib/site.ts:24 · chao-dee/src/lib/line-oa.ts:10)
 *
 * ถุงเขียวต่อ URL ดิบ ๆ ไม่ normalize ไม่ encode → adopt ตัวนี้แล้วจะได้ลิงก์ที่ถูกกว่าเดิม
 */

/** normalize @id ให้ขึ้นต้นด้วย @ + คืนลิงก์แอดเพื่อน LINE OA */
export function lineOaUrl(id: string): string {
  const clean = id.trim();
  if (!clean) return "";
  const withAt = clean.startsWith("@") ? clean : `@${clean}`;
  return `https://line.me/R/ti/p/${encodeURIComponent(withAt)}`;
}
