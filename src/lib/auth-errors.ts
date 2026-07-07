/** แปลง error ของ Supabase auth เป็นข้อความภาษาไทย (ใช้ร่วมทุกฟอร์ม auth) */
export function thaiAuthError(err: { code?: string; message?: string } | null): string {
  const code = err?.code ?? "";
  const msg = err?.message ?? "";
  if (code === "otp_expired" || /expired/i.test(msg))
    return "รหัส OTP หมดอายุแล้ว — กรุณากด “ขอรหัสใหม่”";
  if (code === "same_password" || /different from the old|should be different|same password/i.test(msg))
    return "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม กรุณาตั้งรหัสใหม่ที่ต่างจากเดิม";
  if (/password/i.test(msg) && /6|8|short|weak|at least|characters/i.test(msg))
    return "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร";
  if (code === "otp_disabled" || /token|invalid|not found|incorrect/i.test(msg))
    return "รหัส OTP ไม่ถูกต้อง หรือถูกใช้ไปแล้ว — กรุณากด “ขอรหัสใหม่” แล้วกรอกรหัสล่าสุด";
  if (/rate|too many|429/i.test(msg) || code === "over_request_rate_limit")
    return "ทำรายการถี่เกินไป กรุณารอสักครู่แล้วลองใหม่";
  if (/registered|already|exists/i.test(msg)) return "เบอร์นี้มีบัญชีอยู่แล้ว";
  if (/phone.*disabled|disabled.*phone|signups.*disabled/i.test(msg))
    return "ระบบยืนยันเบอร์ยังไม่พร้อมใช้งาน กรุณาติดต่อทีมงาน";
  return "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
}
