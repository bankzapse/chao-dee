"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrgId } from "@/lib/auth";
import { makeSlug } from "@/lib/listings";
import { promoPlan } from "@/lib/promotions";
import { sendSms, isSmsConfigured } from "@/lib/sms";
import type { FormState } from "@/components/action-form";
import type { DiscountType, LeadStatus, PropertyType } from "@/lib/types";

/** ตารางยังไม่ถูกสร้าง (prod ยังไม่ได้รัน migration 0024) */
function tableMissing(msg?: string): boolean {
  return Boolean(msg && /does not exist|schema cache|could not find the table/i.test(msg));
}
const NOT_READY = "ระบบประกาศยังไม่พร้อมใช้งาน (ผู้ดูแลต้องรัน migration 0024 บนฐานข้อมูลก่อน)";

function parse(formData: FormData) {
  const type = String(formData.get("property_type") ?? "dorm");
  const dtype = String(formData.get("first_month_discount_type") ?? "percent");
  return {
    title: String(formData.get("title") ?? "").trim(),
    property_type: (["dorm", "condo", "apartment"].includes(type)
      ? type
      : "dorm") as PropertyType,
    description: String(formData.get("description") ?? "").trim(),
    province: String(formData.get("province") ?? "").trim(),
    district: String(formData.get("district") ?? "").trim(),
    address: String(formData.get("address") ?? "").trim(),
    contact_phone: String(formData.get("contact_phone") ?? "").trim(),
    contact_line: String(formData.get("contact_line") ?? "").trim(),
    cover_image: String(formData.get("cover_image") ?? "").trim(),
    amenities: formData.getAll("amenities").map(String),
    first_month_discount_type: (dtype === "baht" ? "baht" : "percent") as DiscountType,
    first_month_discount_value: Math.max(0, Number(formData.get("first_month_discount_value") ?? 0)),
  };
}

/** สร้าง/แก้ไขประกาศของอาคารหนึ่ง (1 ประกาศ = 1 อาคาร) */
export async function saveListing(
  buildingId: string,
  listingId: string | null,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const data = parse(formData);
  if (!data.title) return { error: "กรุณาระบุชื่อที่พัก", values: { ...data, building_id: buildingId } };

  const supabase = await createClient();
  const org_id = await getOrgId();

  if (listingId) {
    const { error } = await supabase
      .from("property_listings")
      .update(data)
      .eq("id", listingId)
      .eq("org_id", org_id);
    if (error) return { error: tableMissing(error.message) ? NOT_READY : error.message, values: { ...data, building_id: buildingId } };
    return { ok: true };
  }

  const id = crypto.randomUUID();
  const slug = makeSlug(data.title, id);
  const { error } = await supabase.from("property_listings").insert({
    id,
    slug,
    org_id,
    building_id: buildingId,
    ...data,
  });
  if (error) return { error: tableMissing(error.message) ? NOT_READY : error.message, values: { ...data, building_id: buildingId } };
  return { ok: true };
}

/** เผยแพร่ / ปิดเผยแพร่ประกาศ */
export async function togglePublish(listingId: string, publish: boolean): Promise<void> {
  const supabase = await createClient();
  const org_id = await getOrgId();
  await supabase
    .from("property_listings")
    .update({ is_published: publish })
    .eq("id", listingId)
    .eq("org_id", org_id);
}

export async function deleteListing(listingId: string): Promise<void> {
  const supabase = await createClient();
  const org_id = await getOrgId();
  await supabase.from("property_listings").delete().eq("id", listingId).eq("org_id", org_id);
}

/** อัปเดตสถานะ lead (ใหม่ → ติดต่อแล้ว → เข้าพัก/ไม่สำเร็จ) */
export async function updateLeadStatus(leadId: string, status: LeadStatus): Promise<void> {
  const supabase = await createClient();
  const org_id = await getOrgId();
  await supabase
    .from("listing_leads")
    .update({ status })
    .eq("id", leadId)
    .eq("org_id", org_id);
}

export async function deleteLead(leadId: string): Promise<void> {
  const supabase = await createClient();
  const org_id = await getOrgId();
  await supabase.from("listing_leads").delete().eq("id", leadId).eq("org_id", org_id);
}

/** แจ้งผู้ดูแลแพลตฟอร์มว่ามีคำขอโปรโมทใหม่ (best-effort) */
async function notifyAdminsNewPromotion(orgId: string, listingTitle: string, amount: number) {
  if (!isSmsConfigured()) return;
  try {
    const admin = createAdminClient();
    const [{ data: org }, { data: admins }] = await Promise.all([
      admin.from("organizations").select("name").eq("id", orgId).maybeSingle(),
      admin.from("profiles").select("phone").eq("is_platform_admin", true),
    ]);
    const orgName = org?.name ?? "กิจการ";
    const msg = `Chao-Dee: คำขอโปรโมทประกาศใหม่จาก "${orgName}" (${listingTitle}) ฿${amount.toLocaleString()} — อนุมัติที่ chao-dee.com/owner/listings`;
    await Promise.all(
      (admins ?? [])
        .map((a) => a.phone)
        .filter((p): p is string => Boolean(p))
        .map((phone) => sendSms(phone, msg).catch(() => null))
    );
  } catch {
    // เงียบไว้
  }
}

/** สมาชิกส่งคำขอซื้อโปรโมท (แนบสลิป) → เจ้าของระบบอนุมัติภายหลัง */
export async function submitPromotion(data: {
  listing_id: string;
  days: number;
  slip_path: string;
}): Promise<{ ok?: boolean; error?: string }> {
  const plan = promoPlan(data.days);
  if (!data.slip_path?.trim()) return { error: "กรุณาแนบสลิปการโอนก่อนส่งคำขอ" };

  const supabase = await createClient();
  const org_id = await getOrgId();

  // ยืนยันว่าประกาศเป็นของ org นี้จริง
  const { data: listing } = await supabase
    .from("property_listings")
    .select("id, title")
    .eq("id", data.listing_id)
    .eq("org_id", org_id)
    .maybeSingle();
  if (!listing) return { error: "ไม่พบประกาศนี้" };

  const { error } = await supabase.from("listing_promotions").insert({
    org_id,
    listing_id: data.listing_id,
    days: plan.days,
    amount: plan.price,
    method: "promptpay",
    status: "pending",
    slip_path: data.slip_path,
    note: `ขอโปรโมท ${plan.label}`,
  });
  if (error) {
    return {
      error: tableMissing(error.message)
        ? "ระบบโปรโมทยังไม่พร้อม (ผู้ดูแลต้องรัน migration 0025)"
        : error.message,
    };
  }

  await notifyAdminsNewPromotion(org_id, listing.title, plan.price);
  return { ok: true };
}
