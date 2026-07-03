/**
 * ข้อมูลบริษัท/ผู้ประกอบการ — ใช้ในหน้า PDPA และใบเสร็จ
 * ตั้งค่าได้ทาง env บน Vercel (ไม่ต้องแก้โค้ด) หรือแก้ค่า fallback ด้านล่าง
 */
export const COMPANY = {
  name: process.env.NEXT_PUBLIC_COMPANY_NAME || "[ชื่อบริษัท/ผู้ประกอบการ]",
  address: process.env.NEXT_PUBLIC_COMPANY_ADDRESS || "[ที่อยู่]",
  taxId: process.env.NEXT_PUBLIC_COMPANY_TAX_ID || "[เลขประจำตัวผู้เสียภาษี]",
  email: process.env.NEXT_PUBLIC_COMPANY_EMAIL || "support@chao-dee.com",
  phone: process.env.NEXT_PUBLIC_COMPANY_PHONE || "",
};
