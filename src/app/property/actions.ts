"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { pushMessage, textMessage, isLineConfigured } from "@/lib/line";

/** ผู้เช่าติดต่อผ่านหน้าประกาศสาธารณะ → บันทึก lead + แจ้งเจ้าของหอทาง LINE */
export async function submitLead(
  listingId: string,
  _prev: { ok?: boolean; error?: string },
  formData: FormData
): Promise<{ ok?: boolean; error?: string }> {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  if (!name || !phone) return { error: "กรุณากรอกชื่อและเบอร์ติดต่อ" };

  const supabase = createAdminClient();
  const { data: listing } = await supabase
    .from("property_listings")
    .select("id, org_id, title, is_published")
    .eq("id", listingId)
    .maybeSingle();

  if (!listing || !listing.is_published) return { error: "ไม่พบประกาศนี้แล้ว" };

  const { error } = await supabase.from("listing_leads").insert({
    listing_id: listing.id,
    org_id: listing.org_id,
    name,
    phone,
    message,
    source: "web",
    status: "new",
  });
  if (error) return { error: "ส่งข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };

  // แจ้งเจ้าของหอทาง LINE (best-effort)
  try {
    if (isLineConfigured()) {
      const { data: org } = await supabase
        .from("organizations")
        .select("owner_line_user_id")
        .eq("id", listing.org_id)
        .maybeSingle();
      if (org?.owner_line_user_id) {
        await pushMessage(org.owner_line_user_id, [
          textMessage(
            `📥 มีผู้สนใจที่พัก (ผ่าน Chao-Dee)\nประกาศ: ${listing.title}\nชื่อ: ${name}\nเบอร์: ${phone}${
              message ? `\nข้อความ: ${message}` : ""
            }\n\nติดต่อกลับและอัปเดตสถานะได้ที่เมนู “ลงประกาศ → ผู้ติดต่อ” ในแอป Chao-Dee`
          ),
        ]);
      }
    }
  } catch {
    // เงียบไว้ — บันทึก lead สำเร็จแล้ว
  }

  return { ok: true };
}
