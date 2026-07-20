"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { pushMessage, textMessage, isLineConfigured } from "@/lib/line";
import { rateLimit } from "@/lib/rate-limit";
import { rateLimitDb } from "@/lib/rate-limit-db";
import { sendEmail, isEmailConfigured } from "@/lib/email";
import { newLeadEmail } from "@/lib/email-templates";

/** คำขอ "ให้เราหาห้องให้" จากผู้เช่า → เข้ากล่องงานทีมนายหน้าใน Console */
export async function submitHousingRequest(
  _prev: { ok?: boolean; error?: string },
  formData: FormData
): Promise<{ ok?: boolean; error?: string }> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`hreq:${ip}`, 5, 10 * 60_000).ok) {
    return { error: "ส่งคำขอถี่เกินไป กรุณารอสักครู่แล้วลองใหม่" };
  }
  if (!(await rateLimitDb(`hreq:${ip}`, 5, 10 * 60_000)).ok) {
    return { error: "ส่งคำขอถี่เกินไป กรุณารอสักครู่แล้วลองใหม่" };
  }

  const g = (k: string, max: number) => String(formData.get(k) ?? "").trim().slice(0, max);
  const name = g("name", 100);
  const phone = g("phone", 30);
  if (!name || !phone) return { error: "กรุณากรอกชื่อและเบอร์ติดต่อ" };
  if (!/^[0-9+\-\s()]{6,20}$/.test(phone)) return { error: "เบอร์ติดต่อไม่ถูกต้อง" };

  const num = (k: string) => {
    const n = Number(formData.get(k) ?? 0);
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  };
  const moveIn = g("move_in", 10);

  const supabase = createAdminClient();
  const { error } = await supabase.from("agency_requests").insert({
    name,
    phone,
    province: g("province", 100),
    district: g("district", 100),
    budget_min: num("budget_min"),
    budget_max: num("budget_max"),
    occupants: Math.max(1, Math.floor(num("occupants")) || 1),
    move_in: /^\d{4}-\d{2}-\d{2}$/.test(moveIn) ? moveIn : null,
    note: g("note", 1000),
    status: "new",
  });
  if (error) {
    if (/schema cache|does not exist|could not find/i.test(error.message)) {
      return { error: "ระบบยังไม่พร้อมรับคำขอ กรุณาลองใหม่ภายหลัง" };
    }
    return { error: "ส่งคำขอไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
  }
  return { ok: true };
}

/** ผู้เช่าติดต่อผ่านหน้าประกาศ /rent → บันทึก lead + แจ้งเจ้าของทาง LINE */
export async function submitLead(
  listingId: string,
  _prev: { ok?: boolean; error?: string },
  formData: FormData
): Promise<{ ok?: boolean; error?: string }> {
  // กัน spam: จำกัดจำนวนต่อ IP (ชั้นเสริม)
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`lead:${ip}`, 5, 5 * 60_000).ok) {
    return { error: "ส่งข้อมูลถี่เกินไป กรุณารอสักครู่แล้วลองใหม่" };
  }
  if (!(await rateLimitDb(`lead:${ip}`, 5, 5 * 60_000)).ok) {
    return { error: "ส่งข้อมูลถี่เกินไป กรุณารอสักครู่แล้วลองใหม่" };
  }

  const name = String(formData.get("name") ?? "").trim().slice(0, 100);
  const phone = String(formData.get("phone") ?? "").trim().slice(0, 30);
  const message = String(formData.get("message") ?? "").trim().slice(0, 1000);
  if (!name || !phone) return { error: "กรุณากรอกชื่อและเบอร์ติดต่อ" };
  if (!/^[0-9+\-\s()]{6,20}$/.test(phone)) return { error: "เบอร์ติดต่อไม่ถูกต้อง" };

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
            `📥 มีผู้สนใจที่พัก (ผ่าน Chao-Dee Rent)\nประกาศ: ${listing.title}\nชื่อ: ${name}\nเบอร์: ${phone}${
              message ? `\nข้อความ: ${message}` : ""
            }\n\nดูและติดต่อกลับได้ที่เมนู “ลงประกาศ → ผู้ติดต่อ”`
          ),
        ]);
      }
    }
  } catch {
    // best-effort
  }

  // แจ้งเจ้าของหอทางอีเมลด้วย (best-effort — เมื่อตั้งค่าอีเมลแล้ว)
  try {
    if (isEmailConfigured()) {
      const { data: owner } = await supabase
        .from("profiles")
        .select("email")
        .eq("org_id", listing.org_id)
        .eq("role", "owner")
        .maybeSingle();
      if (owner?.email) {
        const tpl = newLeadEmail({ listingTitle: listing.title, name, phone, message });
        await sendEmail({ to: owner.email, subject: tpl.subject, html: tpl.html });
      }
    }
  } catch {
    // best-effort
  }

  return { ok: true };
}
