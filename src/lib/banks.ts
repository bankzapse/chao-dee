/**
 * รายชื่อธนาคารไทย (สำหรับ dropdown เลือกธนาคาร) — ย้ายไปอยู่ที่ @platform/core แล้ว
 *
 * โค้ดจริงอยู่ที่ micro-services/packages/core/src/banks.ts
 * สำเนาที่ใช้ build อยู่ที่ src/lib/_core/banks.ts (ไฟล์ generate — ห้ามแก้)
 *
 * core เก็บทั้งชื่อสั้น (รูปแบบที่ ChaoDee เก็บใน DB) และชื่อเต็ม (รูปแบบของ thung-kheow-service)
 * พร้อม key ถาวรไว้ join กัน → รวมรายชื่อได้โดยไม่ต้อง migrate ข้อมูลเก่าของฝั่งไหนเลย
 *
 * ที่นี่ส่งออกเฉพาะชื่อสั้นในชื่อเดิม THAI_BANKS — ค่าและลำดับเท่าเดิมทุกตัว
 * ถ้าต้องการชื่อเต็มหรือ findBank() ให้ import จาก "./_core/banks" ตรง ๆ
 */
export { BANK_SHORT_NAMES as THAI_BANKS } from "./_core/banks";
