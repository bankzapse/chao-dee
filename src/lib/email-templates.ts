import "server-only";
import { emailShell } from "@/lib/email";

const APP_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://chao-dee.com";

/** อีเมลต้อนรับ (ส่งครั้งแรกหลังสมัคร) */
export function welcomeEmail(orgName: string): { subject: string; html: string } {
  const tips = [
    "🏢 เพิ่มอาคารและห้องพักของคุณ",
    "👤 บันทึกผู้เช่าและทำสัญญาเช่า",
    "🧾 ออกบิลอัตโนมัติ พร้อม QR พร้อมเพย์",
    "💚 เชื่อม LINE OA เพื่อส่งบิล/แจ้งเตือนผู้เช่า",
  ];
  return {
    subject: `ยินดีต้อนรับสู่ Chao-Dee 🎉`,
    html: emailShell(
      `ยินดีต้อนรับ, ${orgName}`,
      `ขอบคุณที่เริ่มใช้ Chao-Dee! คุณมีเวลา <b>ทดลองใช้ฟรี 30 วัน</b> เต็มทุกฟีเจอร์<br/><br/>
       เริ่มต้นง่าย ๆ ใน 4 ขั้นตอน:
       <ul style="padding-left:18px;margin:10px 0">
         ${tips.map((t) => `<li style="margin:4px 0">${t}</li>`).join("")}
       </ul>`,
      { label: "เข้าสู่แดชบอร์ด", url: `${APP_URL}/dashboard` }
    ),
  };
}

/** อีเมลใกล้หมดช่วงทดลอง/แพ็คเกจ */
export function trialEndingEmail(orgName: string, daysLeft: number): { subject: string; html: string } {
  return {
    subject: `เหลืออีก ${daysLeft} วัน — ต่ออายุ Chao-Dee ของ ${orgName}`,
    html: emailShell(
      `ช่วงใช้งานใกล้หมดแล้ว`,
      `แพ็คเกจของ <b>${orgName}</b> จะหมดอายุในอีก <b>${daysLeft} วัน</b>
       ต่ออายุเพื่อใช้งานต่อเนื่อง ไม่สะดุดการออกบิล/แจ้งเตือนผู้เช่า`,
      { label: "ต่ออายุแพ็คเกจ", url: `${APP_URL}/renew` }
    ),
  };
}
