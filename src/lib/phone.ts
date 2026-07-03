/**
 * ยูทิลแปลงรูปแบบเบอร์โทรไทย — รวมไว้ที่เดียวเพื่อความสม่ำเสมอ
 *  - E.164 มี +  : "+66812345678"  (ใช้กับ Supabase signIn/OTP)
 *  - E.164 ตัวเลข: "66812345678"    (รูปแบบที่ auth.users.phone เก็บ)
 *  - ไทยท้องถิ่น  : "0812345678"     (แสดงผล / ส่ง SMS)
 */

/** "0812345678" | "66812345678" | "+66..." → "+66812345678"; ไม่ถูกต้อง → null */
export function toE164(input: string): string | null {
  const d = input.replace(/\D/g, "");
  if (d.startsWith("0") && d.length === 10) return "+66" + d.slice(1);
  if (d.startsWith("66") && d.length === 11) return "+" + d;
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
