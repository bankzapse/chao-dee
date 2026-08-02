/* ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ ไฟล์นี้ถูก generate อัตโนมัติ — ห้ามแก้ที่นี่ (แก้แล้วจะถูกทับรอบ sync ถัดไป)
 *
 * ต้นทาง : micro-services/packages/core/src/index.ts
 * วิธีแก้ : แก้ที่ต้นทาง → รัน `npm test` แล้ว `npm run sync` ใน repo micro-services
 *          → commit ไฟล์ที่เปลี่ยนใน repo นี้ด้วย
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * @platform/core — ฟังก์ชัน pure ที่ใช้ร่วมกันระหว่างแอป
 *
 * ⛔ กฎเหล็กของแพ็กเกจนี้ (ห้ามละเมิด ไม่งั้น sync เข้าแอปแล้วพัง):
 *    1. ห้าม import React / next/* / "server-only"
 *    2. ห้ามอ่าน process.env — ค่าคอนฟิกเป็นของแอป ให้รับผ่าน argument
 *    3. ห้ามแตะ DB / network / filesystem
 *    4. ทุกฟังก์ชันต้องเทสต์ได้ด้วยการเรียกตรง ๆ
 *
 * เหตุผล: ChaoDee อยู่ React 19 / Next 15.1.6 / Tailwind 4
 *         ถุงเขียวอยู่ React 18.3.1 / Next 15.5.20 / Tailwind 3.4
 *         อะไรที่แตะ framework จะย้ายข้ามไม่ได้จนกว่าจะอัปเวอร์ชันให้ตรงกัน
 */

export { buildPromptPayPayload } from "./promptpay";
export { toE164, toE164Digits, toLocalThai } from "./phone";
export { csvCell, toCsv, csvResponse } from "./csv";
export {
  THAI_BANKS,
  BANK_SHORT_NAMES,
  BANK_FULL_NAMES,
  findBank,
  type ThaiBank,
} from "./banks";
export { lineOaUrl } from "./line-oa";
