import "server-only";
import { emailShell } from "@/lib/email";
import { formatBaht } from "@/lib/format";

const APP_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://chao-dee.com";

/** สรุปผลประกอบการรายเดือนให้เจ้าของหอ */
export function monthlySummaryEmail(opts: {
  orgName: string;
  periodLabel: string; // เช่น "กรกฎาคม 2568"
  invoiceCount: number;
  collected: number; // เก็บได้จริง (paid_amount รวม)
  outstanding: number; // ค้างชำระ
  unpaidCount: number;
  occupied: number;
  totalRooms: number;
  expenses: number;
  net: number; // เก็บได้ - ค่าใช้จ่าย
}): { subject: string; html: string } {
  const occPct = opts.totalRooms > 0 ? Math.round((opts.occupied / opts.totalRooms) * 100) : 0;
  const stat = (label: string, value: string, color = "#0f172a") =>
    `<td style="padding:10px;border:1px solid #e2e8f0;border-radius:10px;text-align:center;width:50%">
       <div style="font-size:20px;font-weight:700;color:${color}">${value}</div>
       <div style="font-size:12px;color:#64748b">${label}</div>
     </td>`;

  const body = `
    สรุปภาพรวมของ <b>${opts.orgName}</b> ประจำเดือน <b>${opts.periodLabel}</b>
    <table style="width:100%;border-collapse:separate;border-spacing:6px;margin:14px 0">
      <tr>
        ${stat("เก็บเงินได้", formatBaht(opts.collected), "#059669")}
        ${stat("ค้างชำระ", formatBaht(opts.outstanding), opts.outstanding > 0 ? "#e11d48" : "#0f172a")}
      </tr>
      <tr>
        ${stat("ค่าใช้จ่าย", formatBaht(opts.expenses))}
        ${stat("คงเหลือสุทธิ", formatBaht(opts.net), opts.net >= 0 ? "#059669" : "#e11d48")}
      </tr>
      <tr>
        ${stat("อัตราเข้าพัก", `${occPct}% (${opts.occupied}/${opts.totalRooms})`)}
        ${stat("บิลค้างชำระ", `${opts.unpaidCount} จาก ${opts.invoiceCount} ใบ`)}
      </tr>
    </table>
    ${opts.outstanding > 0 ? `<div style="font-size:13px;color:#b45309">มีบิลค้างชำระ ${opts.unpaidCount} ใบ — ติดตามได้ในหน้าบิล</div>` : ""}
  `;

  return {
    subject: `📊 สรุปรายเดือน ${opts.periodLabel} — ${opts.orgName}`,
    html: emailShell(`สรุปประจำเดือน ${opts.periodLabel}`, body, {
      label: "ดูรายงานฉบับเต็ม",
      url: `${APP_URL}/reports`,
    }),
  };
}

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

/** อีเมลแจ้งเจ้าของหอเมื่อมีผู้สนใจติดต่อจากประกาศ (marketplace lead) */
export function newLeadEmail(opts: {
  listingTitle: string;
  name: string;
  phone: string;
  message?: string;
}): { subject: string; html: string } {
  return {
    subject: `📥 มีผู้สนใจที่พัก: ${opts.listingTitle}`,
    html: emailShell(
      "มีผู้สนใจติดต่อผ่าน Chao-Dee Rent",
      `ประกาศ: <b>${opts.listingTitle}</b><br/>
       ชื่อ: <b>${opts.name}</b><br/>
       เบอร์: <b>${opts.phone}</b>
       ${opts.message ? `<br/>ข้อความ: ${opts.message}` : ""}`,
      { label: "ดูผู้ติดต่อทั้งหมด", url: `${APP_URL}/listing/leads` }
    ),
  };
}

/** อีเมลแจ้งเมื่อการชำระถูกปฏิเสธ */
export function paymentRejectedEmail(orgName: string): { subject: string; html: string } {
  return {
    subject: `การชำระเงินไม่ผ่านการตรวจสอบ — ${orgName}`,
    html: emailShell(
      "การชำระเงินไม่ผ่านการตรวจสอบ",
      `การแจ้งชำระของ <b>${orgName}</b> ยังไม่ผ่านการยืนยัน อาจเพราะสลิปไม่ชัด/ยอดไม่ตรง
       กรุณาส่งใหม่อีกครั้ง หากมีข้อสงสัยติดต่อทีมงานได้`,
      { label: "แจ้งชำระอีกครั้ง", url: `${APP_URL}/renew` }
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
