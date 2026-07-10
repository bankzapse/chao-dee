"use server";

import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/auth";
import { makeSlug } from "@/lib/listings";
import { checkListingLimit } from "@/lib/listing-limits";
import { parseExtraFields } from "@/lib/listing-parse";
import type { FormState } from "@/components/action-form";
import type { DiscountType, PropertyType } from "@/lib/types";

function tableMissing(msg?: string): boolean {
  return Boolean(msg && /does not exist|schema cache|could not find the table|could not find the .* column/i.test(msg));
}
const NOT_READY = "ระบบประกาศยังไม่พร้อม (ผู้ดูแลต้องรัน migration 0024 + 0027 บนฐานข้อมูลก่อน)";

function parse(formData: FormData) {
  const type = String(formData.get("property_type") ?? "dorm");
  const dtype = String(formData.get("first_month_discount_type") ?? "percent");
  const n = (k: string) => Math.max(0, Number(formData.get(k) ?? 0));
  return {
    title: String(formData.get("title") ?? "").trim(),
    property_type: (["dorm", "condo", "apartment"].includes(type) ? type : "dorm") as PropertyType,
    description: String(formData.get("description") ?? "").trim(),
    province: String(formData.get("province") ?? "").trim(),
    district: String(formData.get("district") ?? "").trim(),
    address: String(formData.get("address") ?? "").trim(),
    contact_phone: String(formData.get("contact_phone") ?? "").trim(),
    contact_line: String(formData.get("contact_line") ?? "").trim(),
    cover_image: String(formData.get("cover_image") ?? "").trim(),
    amenities: formData.getAll("amenities").map(String),
    first_month_discount_type: (dtype === "baht" ? "baht" : "percent") as DiscountType,
    first_month_discount_value: n("first_month_discount_value"),
    price_min: n("price_min"),
    price_max: n("price_max"),
    total_rooms: n("total_rooms"),
    vacant_rooms: n("vacant_rooms"),
    ...parseExtraFields(formData),
  };
}

/** สร้าง/แก้ไขประกาศแบบ standalone (ไม่ผูกอาคาร — กรอกราคา/ห้องว่างเอง) */
export async function saveStandaloneListing(
  listingId: string | null,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const data = parse(formData);
  // บังคับกรอกครบ (ยกเว้นรายละเอียด/จุดเด่น)
  if (!data.title) return { error: "กรุณาระบุชื่อที่พัก", values: { ...data } };
  if (!data.province || !data.district) return { error: "กรุณาเลือกจังหวัดและอำเภอ/เขต", values: { ...data } };
  if (!(data.price_min > 0)) return { error: "กรุณาระบุราคาต่ำสุด/เดือน", values: { ...data } };
  if (!data.contact_phone) return { error: "กรุณาระบุเบอร์ติดต่อ", values: { ...data } };

  const supabase = await createClient();
  const org_id = await getOrgId();

  if (listingId) {
    const { error } = await supabase
      .from("property_listings")
      .update(data)
      .eq("id", listingId)
      .eq("org_id", org_id);
    if (error) return { error: tableMissing(error.message) ? NOT_READY : error.message, values: { ...data } };
    return { ok: true };
  }

  // จำกัดจำนวนประกาศ: บัญชี rent (ใช้ฟรี) = 1 · ลูกค้า Chao-Dee = 10
  const limitErr = await checkListingLimit(org_id);
  if (limitErr) return { error: limitErr, values: { ...data } };

  const id = crypto.randomUUID();
  const slug = makeSlug(data.title, id);
  const { error } = await supabase.from("property_listings").insert({
    id,
    slug,
    org_id,
    building_id: null,
    is_published: true, // ลงประกาศแล้วขึ้นทันที (ปิดได้ภายหลัง)
    ...data,
  });
  if (error) return { error: tableMissing(error.message) ? NOT_READY : error.message, values: { ...data } };
  return { ok: true };
}
