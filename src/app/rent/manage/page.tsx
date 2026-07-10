import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/auth";
import { BrandMark } from "@/components/brand-mark";
import { DeleteButton } from "@/components/action-form";
import { formatBaht, formatDate } from "@/lib/format";
import {
  PROPERTY_TYPE_LABEL,
  discountLabel,
  roomStatByBuilding,
  displayStat,
} from "@/lib/listings";
import { isFeaturedActive } from "@/lib/promotions";
import { getEffectivePromoPlans } from "@/lib/promotions-db";
import { signOut } from "@/app/login/actions";
import type { PropertyListing } from "@/lib/types";
import { PublishToggle } from "@/app/(app)/listing/listing-form";
import { PromoteButton } from "@/app/(app)/listing/promote-form";
import { ListingMediaButton } from "@/app/(app)/listing/listing-media";
import { deleteListing } from "@/app/(app)/listing/actions";
import { StandaloneListingButton } from "./manage-form";

export const metadata = { title: "ประกาศของฉัน | Chao-Dee Rent", robots: { index: false } };

export default async function RentManage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/rent/login");

  const org_id = await getOrgId();
  const platformPromptPay = process.env.NEXT_PUBLIC_PLATFORM_PROMPTPAY ?? "";
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: listingsRaw }, promoPlans] = await Promise.all([
    supabase.from("property_listings").select("*").eq("org_id", org_id).order("created_at", { ascending: false }),
    getEffectivePromoPlans(),
  ]);
  const listings = (listingsRaw ?? []) as unknown as PropertyListing[];

  const buildingIds = listings.map((l) => l.building_id).filter(Boolean) as string[];
  const { data: rooms } = buildingIds.length
    ? await supabase.from("rooms").select("building_id, status, base_rent").in("building_id", buildingIds)
    : { data: [] };
  const byBuilding = roomStatByBuilding(
    (rooms ?? []) as { building_id: string; status: string; base_rent: number }[]
  );

  const [{ data: promos }, { data: photoRows }] = await Promise.all([
    supabase.from("listing_promotions").select("listing_id, status").eq("org_id", org_id),
    supabase.from("listing_photos").select("listing_id"),
  ]);
  const pendingPromo = new Set<string>();
  (promos ?? []).forEach((p: { listing_id: string; status: string }) => {
    if (p.status === "pending") pendingPromo.add(p.listing_id);
  });
  const photoCount = new Map<string, number>();
  (photoRows ?? []).forEach((p: { listing_id: string }) => {
    photoCount.set(p.listing_id, (photoCount.get(p.listing_id) ?? 0) + 1);
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-800/10 bg-slate-900 text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <Link href="/rent" className="flex items-center gap-2">
            <BrandMark size={28} />
            <span className="font-bold">Chao-Dee <span className="font-light text-amber-300">Rent</span></span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/rent" className="text-slate-300 hover:text-white">ดูหน้าประกาศ</Link>
            <form action={signOut}>
              <button className="text-slate-300 hover:text-white" type="submit">ออกจากระบบ</button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">ประกาศของฉัน</h1>
            <p className="mt-1 text-sm text-slate-500">ลงประกาศฟรี · แก้ไข เผยแพร่ และซื้อโปรโมทได้ที่นี่</p>
          </div>
          <StandaloneListingButton label="+ ลงประกาศใหม่" />
        </div>

        <div className="mt-6 rounded-xl bg-indigo-50 p-4 text-sm text-indigo-800">
          💡 อยากได้ระบบจดมิเตอร์ ออกบิล เชื่อม LINE ผู้เช่า ครบวงจร?{" "}
          <Link href="/signup" className="font-semibold underline">ทดลอง Chao-Dee ฟรี 30 วัน</Link>
        </div>

        {listings.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <p className="text-lg font-semibold text-slate-900">ยังไม่มีประกาศ</p>
            <p className="mt-1 text-sm text-slate-500">กด “ลงประกาศใหม่” เพื่อโพสต์ห้องว่างของคุณ (ฟรี)</p>
            <div className="mt-4 flex justify-center">
              <StandaloneListingButton label="+ ลงประกาศใหม่" />
            </div>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {listings.map((l) => {
              const s = displayStat(l, byBuilding);
              const disc = discountLabel(l.first_month_discount_type, l.first_month_discount_value);
              const featured = isFeaturedActive(l, today);
              return (
                <div key={l.id} className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
                  <div className="flex items-start gap-4 p-4">
                    <div className="h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-slate-50">
                      {l.cover_image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={l.cover_image} alt={l.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-2xl text-slate-300">🏢</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate font-semibold text-slate-900">{l.title}</h3>
                        {l.is_published ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">เผยแพร่</span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">ร่าง</span>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-slate-500">
                        {PROPERTY_TYPE_LABEL[l.property_type]} · ห้องว่าง {s.vacant} · เริ่ม {s.minRent > 0 ? formatBaht(s.minRent) : "-"}
                      </p>
                      {disc && <p className="mt-1 text-xs font-medium text-emerald-600">🎁 ส่วนลดเดือนแรก {disc}</p>}
                      {featured && (
                        <p className="mt-1 text-xs font-medium text-amber-600">
                          ⭐ กำลังโปรโมท{l.featured_until ? ` — ถึง ${formatDate(l.featured_until)}` : ""}
                        </p>
                      )}
                      {pendingPromo.has(l.id) && <p className="mt-1 text-xs text-slate-500">⏳ รออนุมัติโปรโมท</p>}
                      {l.building_id && (
                        <p className="mt-1 text-xs text-slate-400">
                          ผูกกับอาคารในระบบจัดการหอ — ห้องว่าง/ราคาอัปเดตอัตโนมัติ
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-2.5">
                    {l.building_id ? (
                      <Link href="/listing" className="btn-secondary">แก้ไขในระบบจัดการหอ</Link>
                    ) : (
                      <StandaloneListingButton listing={l} label="แก้ไข" variant="secondary" />
                    )}
                    <ListingMediaButton
                      listingId={l.id}
                      count={photoCount.get(l.id) ?? 0}
                      cover={l.cover_image}
                      lat={l.lat}
                      lng={l.lng}
                    />
                    <PublishToggle listingId={l.id} published={l.is_published} />
                    {l.is_published && (
                      <PromoteButton
                        listingId={l.id}
                        platformPromptPay={platformPromptPay}
                        plans={promoPlans}
                        active={featured}
                      />
                    )}
                    {l.is_published && (
                      <Link href={`/rent/${l.slug}`} target="_blank" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
                        เปิดดู →
                      </Link>
                    )}
                    <div className="ml-auto">
                      <DeleteButton action={deleteListing.bind(null, l.id)} confirmText={`ลบประกาศ "${l.title}"?`} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
