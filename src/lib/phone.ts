/**
 * ยูทิลแปลงรูปแบบเบอร์โทรไทย — ย้ายไปอยู่ที่ @platform/core แล้ว
 *
 * โค้ดจริงอยู่ที่ micro-services/packages/core/src/phone.ts
 * สำเนาที่ใช้ build อยู่ที่ src/lib/_core/phone.ts (ไฟล์ generate — ห้ามแก้)
 *
 * ไฟล์นี้เหลือไว้เป็นทางเข้าเดิม ทุกที่ที่ import "@/lib/phone" จึงไม่ต้องแก้
 */
export { toE164, toE164Digits, toLocalThai } from "./_core/phone";
