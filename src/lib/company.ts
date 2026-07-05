/**
 * ข้อมูลบริษัท/ผู้ประกอบการ — ใช้ในหน้า PDPA และใบเสร็จ
 * ตั้งค่าได้ทาง env บน Vercel (ไม่ต้องแก้โค้ด) หรือแก้ค่า fallback ด้านล่าง
 */
export const COMPANY = {
  name: process.env.NEXT_PUBLIC_COMPANY_NAME || "ห้างหุ้นส่วนจำกัด พุงกลม แคทเทอริ่ง",
  nameEn: process.env.NEXT_PUBLIC_COMPANY_NAME_EN || "PHOONGKLOM CATERING LIMITED PARTNERSHIP",
  address:
    process.env.NEXT_PUBLIC_COMPANY_ADDRESS ||
    "359/112 โครงการสุขสมฤทัย หมู่ที่ 4 ตำบลยางเนิ้ง อำเภอสารภี จังหวัดเชียงใหม่ 50140",
  taxId: process.env.NEXT_PUBLIC_COMPANY_TAX_ID || "0503567002941",
  email: process.env.NEXT_PUBLIC_COMPANY_EMAIL || "support@chao-dee.com",
  phone: process.env.NEXT_PUBLIC_COMPANY_PHONE || "",
  /** แบรนด์สินค้า (ผลิตภัณฑ์ภายใต้นิติบุคคล) */
  brand: "Chao-Dee (เช่าดี)",
  /** แบรนด์บริษัทแม่ (เครือ) */
  parent: process.env.NEXT_PUBLIC_PARENT_BRAND || "ServHub",
  /** จด VAT แล้วหรือยัง — ตั้ง NEXT_PUBLIC_COMPANY_VAT=true เมื่อจด VAT เพื่อเปิดใบกำกับภาษี */
  vatRegistered: process.env.NEXT_PUBLIC_COMPANY_VAT === "true",
  vatRate: 7,
};

/** แยกยอดรวม (รวม VAT แล้ว) เป็นฐาน + VAT */
export function splitVat(total: number, rate = COMPANY.vatRate) {
  const base = Math.round((total / (1 + rate / 100)) * 100) / 100;
  const vat = Math.round((total - base) * 100) / 100;
  return { base, vat, total };
}
