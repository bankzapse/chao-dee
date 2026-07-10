import type { PropertyListing } from "@/lib/types";

export type PromoPlan = { days: number; price: number; label: string; popular?: boolean };

/** แพ็คเกจโปรโมท (ดันประกาศขึ้นบนสุด + ป้ายโปรโมท) — ราคาเริ่มต้น (owner แก้ได้ผ่าน promo_prices) */
export const PROMO_PLANS: PromoPlan[] = [
  { days: 15, price: 69, label: "15 วัน" },
  { days: 30, price: 109, label: "30 วัน", popular: true },
  { days: 90, price: 149, label: "90 วัน" },
];

export function promoPlan(days: number, plans: PromoPlan[] = PROMO_PLANS): PromoPlan {
  return plans.find((p) => p.days === days) ?? plans[0];
}

/** ประกาศกำลังโปรโมทอยู่จริงหรือไม่ (featured + ยังไม่หมดอายุ) — เทียบวันที่แบบ YYYY-MM-DD */
export function isFeaturedActive(
  l: Pick<PropertyListing, "is_featured" | "featured_until">,
  today: string
): boolean {
  if (!l.is_featured) return false;
  return !l.featured_until || l.featured_until >= today;
}
