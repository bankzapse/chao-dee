import { createClient } from "@/lib/supabase/server";

/** คืน org_id ของผู้ใช้ที่ล็อกอินอยู่ (โยน error ถ้าไม่ได้ล็อกอิน) */
export async function getOrgId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthenticated");

  const { data } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (!data?.org_id) throw new Error("no org");
  return data.org_id;
}
