/**
 * CSV helpers — ย้ายไปอยู่ที่ @platform/core แล้ว
 *
 * โค้ดจริงอยู่ที่ micro-services/packages/core/src/csv.ts
 * สำเนาที่ใช้ build อยู่ที่ src/lib/_core/csv.ts (ไฟล์ generate — ห้ามแก้)
 *
 * ไฟล์นี้เหลือไว้เป็นทางเข้าเดิม ทุกที่ที่ import "@/lib/csv" จึงไม่ต้องแก้
 * (csvCell = ตัว escape ทีละช่อง แยกออกมาเพื่อให้ thung-kheow-service ใช้ร่วมได้)
 */
export { toCsv, csvResponse, csvCell } from "./_core/csv";
