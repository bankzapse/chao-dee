import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { PROMO_PLANS, promoPlan, type PromoPlan } from "@/lib/promotions";

/**
 * ราคาโปรโมทที่มีผลจริง = ค่า default ในโค้ด + ราคาที่ owner แก้ไว้ (ตาราง promo_prices)
 * resilient: ถ้าตารางยังไม่มี → คืนค่า default
 */
export async function getEffectivePromoPlans(): Promise<PromoPlan[]> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from("promo_prices").select("days, price");
    if (error || !data?.length) return PROMO_PLANS.map((p) => ({ ...p }));
    const byDays = new Map(data.map((d) => [Number(d.days), Number(d.price)]));
    return PROMO_PLANS.map((p) => ({ ...p, price: byDays.get(p.days) ?? p.price }));
  } catch {
    return PROMO_PLANS.map((p) => ({ ...p }));
  }
}

/** ราคาโปรโมทที่มีผลจริงของแพ็คเกจหนึ่ง (คำนวณฝั่ง server กันปลอมยอด) */
export async function effectivePromoPrice(days: number): Promise<number> {
  const plans = await getEffectivePromoPlans();
  return promoPlan(days, plans).price;
}
