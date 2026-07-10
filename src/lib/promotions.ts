import type { PropertyListing } from "@/lib/types";

/** แพ็คเกจโปรโมท (ดันประกาศขึ้นบนสุด + ป้ายโปรโมท) — ราคาเริ่มต้น */
export const PROMO_PLANS = [
  { days: 7, price: 99, label: "7 วัน" },
  { days: 30, price: 299, label: "30 วัน", popular: true },
  { days: 90, price: 799, label: "90 วัน" },
] as const;

export function promoPlan(days: number) {
  return PROMO_PLANS.find((p) => p.days === days) ?? PROMO_PLANS[0];
}

/** ประกาศกำลังโปรโมทอยู่จริงหรือไม่ (featured + ยังไม่หมดอายุ) — เทียบวันที่แบบ YYYY-MM-DD */
export function isFeaturedActive(
  l: Pick<PropertyListing, "is_featured" | "featured_until">,
  today: string
): boolean {
  if (!l.is_featured) return false;
  return !l.featured_until || l.featured_until >= today;
}
