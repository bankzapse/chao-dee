import "server-only";
import { createClient } from "@/lib/supabase/server";

/** จำนวนประกาศสูงสุดตามประเภทบัญชี: rent (ใช้ฟรี) = 1 · Chao-Dee = 10 */
export async function checkListingLimit(orgId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("account_type")
    .eq("id", orgId)
    .maybeSingle();
  const isRent = (org as { account_type?: string } | null)?.account_type === "rent";
  const limit = isRent ? 1 : 10;

  const { count } = await supabase
    .from("property_listings")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId);

  if ((count ?? 0) >= limit) {
    return isRent
      ? "บัญชีใช้ฟรีลงประกาศได้ 1 ประกาศ — อัปเกรดเป็นสมาชิก Chao-Dee เพื่อลงได้ถึง 10 ประกาศ"
      : "ลงประกาศได้สูงสุด 10 ประกาศต่อบัญชี";
  }
  return null;
}
