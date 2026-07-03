export type PackageSlug = "plus" | "pro" | "exclusive";

export type Package = {
  slug: PackageSlug;
  name: string;
  tagline: string;
  priceMonthly: number | null; // null = ราคากำหนดเอง (ติดต่อ)
  priceYearly: number | null; // ราคาต่อเดือนเมื่อจ่ายรายปี
  limits: { buildings: string; rooms: string; tenants: string };
  highlight?: boolean; // แพ็คเกจแนะนำ
  cta: string;
};

/** ฟีเจอร์ที่ทุกแพ็คเกจได้ครบ (ต่างกันแค่ขนาด) */
export const COMMON_FEATURES = [
  "แดชบอร์ด & รายงานวิเคราะห์",
  "จดมิเตอร์ + AI อ่านค่าจากรูป",
  "ออกบิลอัตโนมัติ + PromptPay QR",
  "LINE: ส่งบิล/เช็คยอด/แจ้งซ่อม/พัสดุ/ประกาศ",
  "ผังห้อง & จัดการสัญญาเช่า",
  "แจ้งซ่อม · พัสดุ · ยานพาหนะ",
  "แอปมือถือสำหรับเจ้าของ",
  "ซัพพอร์ตทีมงาน",
];

export const PACKAGES: Package[] = [
  {
    slug: "plus",
    name: "Plus",
    tagline: "สำหรับหอพักขนาดเล็ก–กลาง",
    priceMonthly: 899,
    priceYearly: 799,
    limits: { buildings: "4 อาคาร", rooms: "100 ห้อง", tenants: "100 ผู้เช่า" },
    cta: "เริ่มใช้ Plus",
  },
  {
    slug: "pro",
    name: "Pro",
    tagline: "สำหรับธุรกิจที่กำลังเติบโต",
    priceMonthly: 1299,
    priceYearly: 1099,
    limits: { buildings: "10 อาคาร", rooms: "300 ห้อง", tenants: "300 ผู้เช่า" },
    highlight: true,
    cta: "เริ่มใช้ Pro",
  },
  {
    slug: "exclusive",
    name: "Exclusive",
    tagline: "หลายสาขา / เครือใหญ่",
    priceMonthly: null,
    priceYearly: null,
    limits: { buildings: "ไม่จำกัด", rooms: "ไม่จำกัด", tenants: "ไม่จำกัด" },
    cta: "ติดต่อทีมขาย",
  },
];

export function packageBySlug(slug: string): Package | undefined {
  return PACKAGES.find((p) => p.slug === slug);
}
