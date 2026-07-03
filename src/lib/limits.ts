import { createClient } from "@/lib/supabase/server";
import { packageBySlug } from "@/lib/packages";

export type LimitResource = "buildings" | "rooms" | "tenants";

const LABEL: Record<LimitResource, string> = {
  buildings: "อาคาร",
  rooms: "ห้อง",
  tenants: "ผู้เช่า",
};

/**
 * ตรวจว่าองค์กรยังเพิ่มทรัพยากรได้ไหมตามเพดานของแพ็คเกจ
 * คืน { error } ถ้าเกินเพดาน, คืน null ถ้าเพิ่มได้
 */
export async function checkLimit(resource: LimitResource): Promise<{ error: string } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null; // ปล่อยให้ชั้นอื่นจัดการ auth

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_platform_admin, org_id")
    .eq("id", user.id)
    .single();

  // แอดมินแพลตฟอร์ม = ไม่จำกัด
  if (profile?.is_platform_admin) return null;

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("package_slug")
    .maybeSingle();

  const pkg = packageBySlug(sub?.package_slug ?? "plus");
  const cap = pkg?.caps[resource] ?? null;
  if (cap === null) return null; // ไม่จำกัด

  const { count } = await supabase
    .from(resource)
    .select("id", { count: "exact", head: true });

  if ((count ?? 0) >= cap) {
    return {
      error: `แพ็คเกจ ${pkg?.name} จำกัด ${LABEL[resource]} ไม่เกิน ${cap} รายการ — อัปเกรดแพ็คเกจที่หน้าต่ออายุเพื่อเพิ่มได้มากขึ้น`,
    };
  }
  return null;
}
