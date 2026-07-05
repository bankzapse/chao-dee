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
  brand: "ChaoDee (เช่าดี)",
};
