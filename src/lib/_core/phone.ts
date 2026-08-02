/* ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ ไฟล์นี้ถูก generate อัตโนมัติ — ห้ามแก้ที่นี่ (แก้แล้วจะถูกทับรอบ sync ถัดไป)
 *
 * ต้นทาง : micro-services/packages/core/src/phone.ts
 * วิธีแก้ : แก้ที่ต้นทาง → รัน `npm test` แล้ว `npm run sync` ใน repo micro-services
 *          → commit ไฟล์ที่เปลี่ยนใน repo นี้ด้วย
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * ยูทิลแปลงรูปแบบเบอร์โทรไทย — รวมไว้ที่เดียวเพื่อความสม่ำเสมอ
 *  - E.164 มี +  : "+66812345678"  (ใช้กับ Supabase signIn/OTP)
 *  - E.164 ตัวเลข: "66812345678"    (รูปแบบที่ auth.users.phone เก็บ)
 *  - ไทยท้องถิ่น  : "0812345678"     (แสดงผล / ส่ง SMS)
 *
 * ── สถานะการรวม ──────────────────────────────────────────────────────────
 * ที่มา: chao-dee/src/lib/phone.ts (behavior เหมือนเป๊ะ → ChaoDee adopt ได้แบบ no-op)
 *
 * thung-kheow-service ยังมี toE164 / toBare / toE164Bare เขียนซ้ำแบบ inline 13 จุดใน 9 ไฟล์
 * ⚠️ ตัวที่เขียน inline ไม่ validate: "12345" → "+6612345" ส่วนตัวนี้คืน null
 *    → ถุงเขียว adopt ไฟล์นี้เมื่อไหร่ ค่าที่เคยผ่านจะเริ่มถูกปฏิเสธ ต้องไล่ดู 13 จุดนั้นก่อน
 */

/** "0812345678" | "66812345678" | "+66..." → "+66812345678"; ไม่ถูกต้อง → null */
export function toE164(input: string): string | null {
  const d = input.replace(/\D/g, "");
  if (d.startsWith("0") && d.length === 10) return "+66" + d.slice(1);
  if (d.startsWith("66") && d.length === 11) return "+" + d;
  // ⚠️ ช่องโหว่ที่รู้ตัว: สาขานี้รับเบอร์ประเทศไหนก็ได้ที่ยาว >= 11 หลัก
  //    คงไว้ตามต้นฉบับเพื่อให้ ChaoDee adopt ได้โดยพฤติกรรมไม่เปลี่ยน
  //    จะรัดกุมขึ้นต้องตัดสินใจแยก (กระทบ login/signup ของ ChaoDee)
  if (input.trim().startsWith("+") && d.length >= 11) return "+" + d;
  return null;
}

/** เหมือน toE164 แต่ไม่มีเครื่องหมาย + (ตรงกับที่ auth.users.phone เก็บ) */
export function toE164Digits(input: string): string | null {
  const e = toE164(input);
  return e ? e.slice(1) : null;
}

/** แปลงเป็นรูปแบบไทยท้องถิ่นสำหรับแสดง/ส่ง SMS: "66xxxxxxxxx" → "0xxxxxxxxx" */
export function toLocalThai(input: string): string {
  const d = input.replace(/\D/g, "");
  if (d.startsWith("66")) return "0" + d.slice(2);
  return d;
}
