import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { PACKAGES, packageBySlug, type Package } from "@/lib/packages";

/**
 * แพ็คเกจที่มีผลจริง = ค่า default ในโค้ด + ราคาที่ owner แก้ไว้ (ตาราง package_prices)
 * resilient: ถ้าตารางยังไม่มี (ยังไม่ได้รัน migration) → คืนค่า default
 */
export async function getEffectivePackages(): Promise<Package[]> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("package_prices")
      .select("slug, price_monthly, price_yearly_per_month, price_yearly_total");
    if (error || !data?.length) return PACKAGES;

    const bySlug = new Map(data.map((d) => [d.slug, d]));
    return PACKAGES.map((p) => {
      const o = bySlug.get(p.slug);
      if (!o) return p;
      const num = (v: unknown, fallback: number | null) =>
        v === null || v === undefined ? fallback : Number(v);
      return {
        ...p,
        priceMonthly: num(o.price_monthly, p.priceMonthly),
        priceYearlyPerMonth: num(o.price_yearly_per_month, p.priceYearlyPerMonth),
        priceYearlyTotal: num(o.price_yearly_total, p.priceYearlyTotal),
      };
    });
  } catch {
    return PACKAGES;
  }
}

/** แพ็คเกจเดียวตาม slug (ราคาที่มีผลจริง) */
export async function effectivePackageBySlug(slug: string): Promise<Package | undefined> {
  const pkgs = await getEffectivePackages();
  return pkgs.find((p) => p.slug === slug) ?? packageBySlug(slug);
}
