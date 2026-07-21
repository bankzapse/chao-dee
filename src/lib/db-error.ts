/**
 * แปลงข้อความ error จาก Postgres/Supabase ให้ผู้ใช้อ่านรู้เรื่อง
 * (ข้อความดิบเป็นภาษาอังกฤษเชิงเทคนิค ผู้ใช้ทั่วไปอ่านแล้วไม่รู้ว่าต้องทำอะไรต่อ)
 */
export function dbErrorMessage(msg?: string): string {
  if (!msg) return "ทำรายการไม่สำเร็จ ลองใหม่อีกครั้ง";
  if (/violates foreign key|still referenced|foreign key constraint/i.test(msg)) {
    return "ลบไม่ได้ เพราะมีข้อมูลอื่นอ้างถึงอยู่ — ลบข้อมูลที่เกี่ยวข้องก่อน";
  }
  if (/row-level security|permission denied|not authorized/i.test(msg)) {
    return "คุณไม่มีสิทธิ์ทำรายการนี้ (เฉพาะเจ้าของกิจการ/ผู้ดูแล)";
  }
  if (/duplicate key|unique constraint/i.test(msg)) {
    return "มีข้อมูลนี้อยู่แล้ว";
  }
  return msg;
}

/**
 * ข้อความเมื่อคำสั่งสำเร็จแต่ "ไม่โดนแถวไหนเลย"
 *
 * สำคัญ: RLS ของ Postgres ไม่ได้ throw error เวลาไม่มีสิทธิ์ แต่จะ "กรองแถวทิ้ง" เงียบๆ
 * ถ้าเช็คแค่ error จะได้ผลว่าสำเร็จทั้งที่ไม่มีอะไรถูกลบ/แก้เลย
 */
export const NO_ROWS_MESSAGE =
  "ทำรายการไม่สำเร็จ — อาจไม่มีสิทธิ์ หรือรายการถูกลบไปแล้ว (ลองรีเฟรชหน้า)";
