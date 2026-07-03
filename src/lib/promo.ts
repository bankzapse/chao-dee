import { createAdminClient } from "@/lib/supabase/admin";

export type PromoResult =
  | { ok: true; code: string; discount: number; final: number }
  | { ok: false; error: string };

/**
 * ตรวจสอบและคำนวณส่วนลดจากคูปอง (ใช้ service role — ไม่เปิดเผยคูปองทั้งหมด)
 * ไม่เพิ่ม used_count ที่นี่ (เพิ่มตอนยืนยันการชำระ)
 */
export async function applyPromo(rawCode: string, baseAmount: number): Promise<PromoResult> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, error: "กรุณากรอกโค้ด" };

  const admin = createAdminClient();
  const { data: promo } = await admin
    .from("promo_codes")
    .select("*")
    .ilike("code", code)
    .maybeSingle();

  if (!promo || !promo.active) return { ok: false, error: "โค้ดไม่ถูกต้องหรือถูกปิดใช้งาน" };
  if (promo.expires_at && new Date(promo.expires_at) < new Date())
    return { ok: false, error: "โค้ดหมดอายุแล้ว" };
  if (promo.max_uses !== null && promo.used_count >= promo.max_uses)
    return { ok: false, error: "โค้ดถูกใช้ครบจำนวนแล้ว" };

  let discount = 0;
  if (promo.percent_off) discount = Math.round((baseAmount * promo.percent_off) / 100);
  else if (promo.amount_off) discount = Number(promo.amount_off);
  discount = Math.min(discount, baseAmount);
  const final = Math.max(0, baseAmount - discount);

  return { ok: true, code: promo.code, discount, final };
}

/** เพิ่มจำนวนการใช้คูปอง (เรียกตอนยืนยันการชำระ) */
export async function incrementPromoUse(code: string): Promise<void> {
  if (!code) return;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("promo_codes")
      .select("id, used_count")
      .ilike("code", code.trim())
      .maybeSingle();
    if (data) {
      await admin
        .from("promo_codes")
        .update({ used_count: data.used_count + 1 })
        .eq("id", data.id);
    }
  } catch {
    /* best-effort */
  }
}
