/**
 * ข้อมูลบริษัท/ผู้ประกอบการ — ใช้ในหน้า PDPA และใบเสร็จ
 * ตั้งค่าได้ทาง env บน Vercel (ไม่ต้องแก้โค้ด) หรือแก้ค่า fallback ด้านล่าง
 */
export const COMPANY = {
  name: process.env.NEXT_PUBLIC_COMPANY_NAME || "บริษัท เช่าดี จำกัด",
  address:
    process.env.NEXT_PUBLIC_COMPANY_ADDRESS ||
    "สำนักงานแห่งใหญ่ ตั้งอยู่เลขที่ 42/42 ซอยขวัญเรือน ถนนศรีโสธรตัดใหม่ ตำบลหน้าเมือง อำเภอเมืองฉะเชิงเทรา จังหวัดฉะเชิงเทรา",
  taxId: process.env.NEXT_PUBLIC_COMPANY_TAX_ID || "0245569003051",
  email: process.env.NEXT_PUBLIC_COMPANY_EMAIL || "support@chao-dee.com",
  phone: process.env.NEXT_PUBLIC_COMPANY_PHONE || "",
};
