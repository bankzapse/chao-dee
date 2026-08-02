/**
 * LINE OA — ส่วนที่เป็น logic ล้วนย้ายไปที่ @platform/core แล้ว
 * (โค้ดจริง: micro-services/packages/core/src/line-oa.ts · สำเนา: src/lib/_core/line-oa.ts)
 *
 * ส่วนที่เป็น "ค่าของแอป" (OA id + env) ยังอยู่ที่นี่ตามเดิม — core ห้ามอ่าน process.env
 */
export { lineOaUrl } from "./_core/line-oa";

import { lineOaUrl } from "./_core/line-oa";

/** LINE OA กลางของ Chao-Dee — ผู้เช่าทุกหอสแกนแอดตัวนี้ตัวเดียว (override ได้ด้วย env) */
export const CHAO_DEE_OA_ID = (process.env.NEXT_PUBLIC_LINE_OA_ID || "@epe8275f").trim();
export const chaoDeeOaUrl = (): string => lineOaUrl(CHAO_DEE_OA_ID);
