"use server";

import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/auth";

export type PhotoView = { id: string; url: string; sort: number };

/** ตรวจว่าประกาศเป็นของ org ผู้ใช้จริง (กันแก้ของคนอื่น) */
async function ownsListing(listingId: string): Promise<boolean> {
  const supabase = await createClient();
  const org_id = await getOrgId();
  const { data } = await supabase
    .from("property_listings")
    .select("id")
    .eq("id", listingId)
    .eq("org_id", org_id)
    .maybeSingle();
  return Boolean(data);
}

/** รายการรูปของประกาศ (เรียงตาม sort) */
export async function listListingPhotos(listingId: string): Promise<PhotoView[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("listing_photos")
    .select("id, url, sort")
    .eq("listing_id", listingId)
    .order("sort", { ascending: true });
  return (data ?? []) as PhotoView[];
}

/** เพิ่มรูป (client อัปโหลดไฟล์ขึ้น bucket แล้วส่ง url มา) — ถ้ายังไม่มีปก ตั้งรูปนี้เป็นปก */
export async function addListingPhoto(
  listingId: string,
  url: string
): Promise<{ ok?: boolean; error?: string }> {
  if (!url) return { error: "ไม่มีไฟล์" };
  if (!(await ownsListing(listingId))) return { error: "ไม่พบประกาศนี้" };

  const supabase = await createClient();
  const org_id = await getOrgId();

  const { data: existing } = await supabase
    .from("listing_photos")
    .select("sort")
    .eq("listing_id", listingId)
    .order("sort", { ascending: false })
    .limit(1);
  const nextSort = (existing?.[0]?.sort ?? -1) + 1;

  const { error } = await supabase
    .from("listing_photos")
    .insert({ listing_id: listingId, url, sort: nextSort });
  if (error) return { error: error.message };

  // ตั้งเป็นปกถ้ายังไม่มี
  const { data: listing } = await supabase
    .from("property_listings")
    .select("cover_image")
    .eq("id", listingId)
    .maybeSingle();
  if (!listing?.cover_image) {
    await supabase.from("property_listings").update({ cover_image: url }).eq("id", listingId).eq("org_id", org_id);
  }
  return { ok: true };
}

export async function deleteListingPhoto(photoId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("listing_photos").delete().eq("id", photoId);
}

/** ตั้งรูปนี้เป็นปกของประกาศ */
export async function setCoverPhoto(listingId: string, url: string): Promise<void> {
  if (!(await ownsListing(listingId))) return;
  const supabase = await createClient();
  const org_id = await getOrgId();
  await supabase.from("property_listings").update({ cover_image: url }).eq("id", listingId).eq("org_id", org_id);
}

/** บันทึกพิกัดปักหมุด (lat/lng) ของประกาศ */
export async function setListingLocation(
  listingId: string,
  lat: number,
  lng: number
): Promise<{ ok?: boolean; error?: string }> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { error: "พิกัดไม่ถูกต้อง" };
  if (!(await ownsListing(listingId))) return { error: "ไม่พบประกาศนี้" };
  const supabase = await createClient();
  const org_id = await getOrgId();
  const { error } = await supabase
    .from("property_listings")
    .update({ lat, lng })
    .eq("id", listingId)
    .eq("org_id", org_id);
  if (error) return { error: error.message };
  return { ok: true };
}
