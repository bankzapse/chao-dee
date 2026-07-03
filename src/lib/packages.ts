export type PackageSlug = "plus" | "pro" | "exclusive";

export type Package = {
  slug: PackageSlug;
  name: string;
  tagline: string;
  priceMonthly: number | null; // ราคารายเดือน (จ่ายเป็นเดือน)
  priceYearlyPerMonth: number | null; // ราคาต่อเดือนเมื่อจ่ายรายปี ("฿699/เดือน")
  priceYearlyTotal: number | null; // ยอดชำระต่อปี ("ชำระ ฿7,390/ปี")
  limits: { buildings: string; rooms: string; tenants: string };
  /** เพดานเชิงตัวเลขไว้บังคับใช้จริง (null = ไม่จำกัด) */
  caps: { buildings: number | null; rooms: number | null; tenants: number | null };
  highlight?: boolean;
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
    priceMonthly: 799,
    priceYearlyPerMonth: 699,
    priceYearlyTotal: 7390,
    limits: { buildings: "4 อาคาร", rooms: "100 ห้อง", tenants: "100 ผู้เช่า" },
    caps: { buildings: 4, rooms: 100, tenants: 100 },
    cta: "เริ่มใช้ Plus",
  },
  {
    slug: "pro",
    name: "Pro",
    tagline: "สำหรับธุรกิจที่กำลังเติบโต",
    priceMonthly: 1199,
    priceYearlyPerMonth: 999,
    priceYearlyTotal: 11190,
    limits: { buildings: "10 อาคาร", rooms: "300 ห้อง", tenants: "300 ผู้เช่า" },
    caps: { buildings: 10, rooms: 300, tenants: 300 },
    highlight: true,
    cta: "เริ่มใช้ Pro",
  },
  {
    slug: "exclusive",
    name: "Exclusive",
    tagline: "สำหรับธุรกิจขนาดใหญ่",
    priceMonthly: null,
    priceYearlyPerMonth: null,
    priceYearlyTotal: null,
    limits: { buildings: "ไม่จำกัด", rooms: "ไม่จำกัด", tenants: "ไม่จำกัด" },
    caps: { buildings: null, rooms: null, tenants: null },
    cta: "ติดต่อเรา",
  },
];

export function packageBySlug(slug: string): Package | undefined {
  return PACKAGES.find((p) => p.slug === slug);
}
