import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState, Badge } from "@/components/ui";
import { DeleteButton } from "@/components/action-form";
import { formatBaht } from "@/lib/format";
import { PROPERTY_TYPE_LABEL, discountLabel } from "@/lib/listings";
import { isFeaturedActive } from "@/lib/promotions";
import { getEffectivePromoPlans } from "@/lib/promotions-db";
import { formatDate } from "@/lib/format";
import type { Building, PropertyListing } from "@/lib/types";
import { ListingButton, PublishToggle } from "./listing-form";
import { PromoteButton } from "./promote-form";
import { ListingMediaButton } from "./listing-media";
import { deleteListing } from "./actions";

export default async function ListingPage() {
  const supabase = await createClient();

  const platformPromptPay = process.env.NEXT_PUBLIC_PLATFORM_PROMPTPAY ?? "";
  const today = new Date().toISOString().slice(0, 10);
  const promoPlans = await getEffectivePromoPlans();

  const [{ data: buildings }, { data: rooms }, listingRes, leadRes, promoRes] = await Promise.all([
    supabase.from("buildings").select("id, name, org_id, address, note, floors, created_at").order("name"),
    supabase.from("rooms").select("building_id, status, base_rent"),
    supabase.from("property_listings").select("*"),
    supabase.from("listing_leads").select("listing_id, status"),
    supabase.from("listing_promotions").select("listing_id, status, expires_at"),
  ]);

  // สถานะโปรโมทต่อประกาศ (pending = รออนุมัติ)
  const pendingPromo = new Set<string>();
  (promoRes.data ?? []).forEach((p: { listing_id: string; status: string }) => {
    if (p.status === "pending") pendingPromo.add(p.listing_id);
  });

  const notReady = Boolean(
    listingRes.error && /does not exist|schema cache|could not find the table/i.test(listingRes.error.message)
  );

  const buildingList = (buildings ?? []) as Building[];
  const listings = (listingRes.data ?? []) as unknown as PropertyListing[];
  const listingByBuilding = new Map<string, PropertyListing>();
  listings.forEach((l) => {
    if (l.building_id) listingByBuilding.set(l.building_id, l);
  });

  // ห้องว่าง + ราคาเริ่มต้น ต่ออาคาร
  const stat = new Map<string, { vacant: number; minRent: number }>();
  (rooms ?? []).forEach((r: { building_id: string; status: string; base_rent: number }) => {
    const s = stat.get(r.building_id) ?? { vacant: 0, minRent: 0 };
    if (r.status === "vacant") s.vacant += 1;
    const rent = Number(r.base_rent);
    if (rent > 0 && (s.minRent === 0 || rent < s.minRent)) s.minRent = rent;
    stat.set(r.building_id, s);
  });

  // จำนวน lead ใหม่ ต่อประกาศ
  const newLeads = new Map<string, number>();
  (leadRes.data ?? []).forEach((l: { listing_id: string; status: string }) => {
    if (l.status === "new") newLeads.set(l.listing_id, (newLeads.get(l.listing_id) ?? 0) + 1);
  });
  const totalNewLeads = [...newLeads.values()].reduce((a, b) => a + b, 0);

  return (
    <div>
      <PageHeader
        title="ลงประกาศหาผู้เช่า"
        subtitle="โปรโมทที่พักบนหน้าเว็บ Chao-Dee — ฟรีสำหรับสมาชิก · ห้องว่างอัปเดตอัตโนมัติ"
        action={
          <div className="flex items-center gap-2">
            <Link href="/rent" target="_blank" className="btn-secondary">
              🔗 ดูหน้าประกาศสาธารณะ
            </Link>
            <Link href="/listing/leads" className="btn-primary">
              📥 ผู้ติดต่อ{totalNewLeads > 0 ? ` (${totalNewLeads})` : ""}
            </Link>
          </div>
        }
      />

      {notReady && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          ระบบประกาศยังไม่พร้อมใช้งาน — ผู้ดูแลระบบต้องรัน migration <code>0024_property_listings</code> บนฐานข้อมูลก่อน
        </div>
      )}

      {buildingList.length === 0 ? (
        <EmptyState
          title="ยังไม่มีอาคาร"
          description="เพิ่มอาคารและห้องพักก่อน แล้วจึงลงประกาศโปรโมทที่พักได้"
          action={
            <Link href="/buildings" className="btn-primary">
              เพิ่มอาคาร
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {buildingList.map((b) => {
            const listing = listingByBuilding.get(b.id);
            const s = stat.get(b.id) ?? { vacant: 0, minRent: 0 };
            const disc = listing
              ? discountLabel(listing.first_month_discount_type, listing.first_month_discount_value)
              : "";
            return (
              <div key={b.id} className="card overflow-hidden">
                <div className="flex items-start gap-4 p-4">
                  <div className="h-20 w-28 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                    {listing?.cover_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={listing.cover_image} alt={b.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl text-slate-300">
                        🏢
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-semibold text-slate-900">
                        {listing?.title || b.name}
                      </h3>
                      {listing &&
                        (listing.is_published ? (
                          <Badge className="bg-emerald-100 text-emerald-700">เผยแพร่</Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-500">ร่าง</Badge>
                        ))}
                    </div>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {listing ? PROPERTY_TYPE_LABEL[listing.property_type] : "ยังไม่ได้ลงประกาศ"}
                      {" · "}
                      ห้องว่าง {s.vacant} · เริ่ม {s.minRent > 0 ? formatBaht(s.minRent) : "-"}
                    </p>
                    {disc && (
                      <p className="mt-1 text-xs font-medium text-emerald-600">
                        🎁 ส่วนลดเดือนแรก {disc}
                      </p>
                    )}
                    {listing && (newLeads.get(listing.id) ?? 0) > 0 && (
                      <p className="mt-1 text-xs font-medium text-indigo-600">
                        📥 มีผู้ติดต่อใหม่ {newLeads.get(listing.id)} ราย
                      </p>
                    )}
                    {listing && isFeaturedActive(listing, today) && (
                      <p className="mt-1 text-xs font-medium text-amber-600">
                        ⭐ กำลังโปรโมท{listing.featured_until ? ` — ถึง ${formatDate(listing.featured_until)}` : ""}
                      </p>
                    )}
                    {listing && pendingPromo.has(listing.id) && (
                      <p className="mt-1 text-xs font-medium text-slate-500">⏳ รอทีมงานอนุมัติโปรโมท</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-2.5">
                  <ListingButton building={b} listing={listing} />
                  {listing && (
                    <>
                      <ListingMediaButton listingId={listing.id} lat={listing.lat} lng={listing.lng} />
                      <PublishToggle listingId={listing.id} published={listing.is_published} />
                      {listing.is_published && (
                        <PromoteButton
                          listingId={listing.id}
                          platformPromptPay={platformPromptPay}
                          plans={promoPlans}
                          active={isFeaturedActive(listing, today)}
                        />
                      )}
                      {listing.is_published && (
                        <Link
                          href={`/rent/${listing.slug}`}
                          target="_blank"
                          className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                        >
                          เปิดดู →
                        </Link>
                      )}
                      <div className="ml-auto">
                        <DeleteButton
                          action={deleteListing.bind(null, listing.id)}
                          confirmText={`ลบประกาศ "${listing.title}"?`}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
