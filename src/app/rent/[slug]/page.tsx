import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { BrandMark } from "@/components/brand-mark";
import { formatBaht } from "@/lib/format";
import { PROPERTY_TYPE_LABEL, discountLabel } from "@/lib/listings";
import type { PropertyListing } from "@/lib/types";
import { LeadForm } from "./lead-form";

export const runtime = "nodejs";

/** slug อาจมาแบบ percent-encoded (เช่น slug ภาษาไทย) — decode ก่อนค้นให้ตรงกับ DB */
function decodeSlug(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

async function getListing(slug: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("property_listings")
    .select("*")
    .eq("slug", decodeSlug(slug))
    .eq("is_published", true)
    .maybeSingle();
  return (data as unknown as PropertyListing) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const l = await getListing(slug);
  if (!l) return { title: "ไม่พบที่พัก | Chao-Dee Rent" };
  const where = [l.district, l.province].filter(Boolean).join(" ");
  const title = `${l.title} ${PROPERTY_TYPE_LABEL[l.property_type]}${where ? " " + where : ""} | Chao-Dee Rent`;
  const description = (
    l.description || `${PROPERTY_TYPE_LABEL[l.property_type]}ให้เช่า ${where} ห้องว่างพร้อมเข้าอยู่`
  ).slice(0, 155);
  return {
    title,
    description,
    alternates: { canonical: `https://www.chao-dee.com/rent/${l.slug}` },
    openGraph: { title, description, images: l.cover_image ? [l.cover_image] : [], type: "website" },
  };
}

export default async function RentDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const l = await getListing(slug);
  if (!l) notFound();

  const supabase = createAdminClient();
  const [{ data: rooms }, { data: photos }] = await Promise.all([
    l.building_id
      ? supabase.from("rooms").select("room_number, status, base_rent").eq("building_id", l.building_id)
      : Promise.resolve({ data: [] as { room_number: string; status: string; base_rent: number }[] }),
    supabase.from("listing_photos").select("url, sort").eq("listing_id", l.id).order("sort"),
  ]);

  const roomList = (rooms ?? []) as { room_number: string; status: string; base_rent: number }[];
  const vacantRooms = roomList
    .filter((r) => r.status === "vacant")
    .sort((a, b) => a.room_number.localeCompare(b.room_number, undefined, { numeric: true }));

  // ผูกอาคาร → ดึงจาก rooms · standalone → ใช้ค่ากรอกเอง
  const rentsFromRooms = vacantRooms.map((r) => Number(r.base_rent)).filter((n) => n > 0);
  const minRent = l.building_id
    ? rentsFromRooms.length
      ? Math.min(...rentsFromRooms)
      : 0
    : Number(l.price_min) || 0;
  const maxRent = l.building_id
    ? rentsFromRooms.length
      ? Math.max(...rentsFromRooms)
      : 0
    : Number(l.price_max) || 0;
  const vacantCount = l.building_id ? vacantRooms.length : Number(l.vacant_rooms) || 0;

  const disc = discountLabel(l.first_month_discount_type, l.first_month_discount_value);
  const gallery = [l.cover_image, ...((photos ?? []) as { url: string }[]).map((p) => p.url)].filter(Boolean);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: l.title,
    description: l.description || `${PROPERTY_TYPE_LABEL[l.property_type]}ให้เช่า`,
    image: l.cover_image || undefined,
    category: PROPERTY_TYPE_LABEL[l.property_type],
    ...(minRent > 0 && {
      offers: {
        "@type": "Offer",
        price: minRent,
        priceCurrency: "THB",
        availability: vacantCount > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        url: `https://www.chao-dee.com/rent/${l.slug}`,
      },
    }),
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="sticky top-0 z-40 border-b border-slate-800/10 bg-slate-900 text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <Link href="/rent" className="flex items-center gap-2 text-sm text-slate-300 hover:text-white">
            ← ประกาศทั้งหมด
          </Link>
          <Link href="/rent" className="flex items-center gap-2">
            <BrandMark size={28} />
            <span className="font-bold">Chao-Dee <span className="font-light text-amber-300">Rent</span></span>
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-6">
        <div className="overflow-hidden rounded-2xl bg-slate-100">
          {l.cover_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={l.cover_image} alt={l.title} className="h-72 w-full object-cover sm:h-96" />
          ) : (
            <div className="flex h-72 w-full items-center justify-center text-6xl text-slate-300 sm:h-96">🏢</div>
          )}
        </div>
        {gallery.length > 1 && (
          <div className="mt-2 flex gap-2 overflow-x-auto">
            {gallery.slice(1).map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={src} alt="" className="h-16 w-24 shrink-0 rounded-lg object-cover" />
            ))}
          </div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <p className="text-sm font-medium uppercase tracking-wider text-amber-600">
              {PROPERTY_TYPE_LABEL[l.property_type]}
            </p>
            <h1 className="mt-1 text-2xl font-extrabold text-slate-900 sm:text-3xl">{l.title}</h1>
            <p className="mt-1 text-slate-500">
              📍 {[l.address, l.district, l.province].filter(Boolean).join(" · ") || "—"}
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <div className="rounded-xl bg-white px-4 py-3 ring-1 ring-slate-200">
                <p className="text-xs text-slate-400">ราคาเริ่มต้น</p>
                <p className="text-lg font-bold text-slate-900">
                  {minRent > 0 ? formatBaht(minRent) : "สอบถาม"}
                  {maxRent > minRent && <span className="text-sm text-slate-400"> – {formatBaht(maxRent)}</span>}
                </p>
              </div>
              <div className="rounded-xl bg-white px-4 py-3 ring-1 ring-slate-200">
                <p className="text-xs text-slate-400">ห้องว่าง</p>
                <p className="text-lg font-bold text-emerald-600">{vacantCount} ห้อง</p>
              </div>
            </div>

            {l.description && (
              <div className="mt-6">
                <h2 className="mb-2 font-semibold text-slate-900">รายละเอียด</h2>
                <p className="whitespace-pre-line text-slate-600">{l.description}</p>
              </div>
            )}

            {l.amenities.length > 0 && (
              <div className="mt-6">
                <h2 className="mb-2 font-semibold text-slate-900">สิ่งอำนวยความสะดวก</h2>
                <div className="flex flex-wrap gap-2">
                  {l.amenities.map((a) => (
                    <span key={a} className="rounded-lg bg-white px-3 py-1.5 text-sm text-slate-600 ring-1 ring-slate-200">
                      ✓ {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {l.lat != null && l.lng != null && (
              <div className="mt-6">
                <h2 className="mb-2 font-semibold text-slate-900">ตำแหน่งบนแผนที่</h2>
                <div className="overflow-hidden rounded-xl ring-1 ring-slate-200">
                  <iframe
                    title="แผนที่ที่พัก"
                    className="h-64 w-full"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${l.lng - 0.008}%2C${
                      l.lat - 0.005
                    }%2C${l.lng + 0.008}%2C${l.lat + 0.005}&layer=mapnik&marker=${l.lat}%2C${l.lng}`}
                  />
                </div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${l.lat}%2C${l.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block text-sm text-indigo-600 hover:text-indigo-700"
                >
                  เปิดใน Google Maps →
                </a>
              </div>
            )}

            {l.building_id && vacantRooms.length > 0 && (
              <div className="mt-6">
                <h2 className="mb-2 font-semibold text-slate-900">ห้องว่างพร้อมเข้าอยู่</h2>
                <div className="overflow-hidden rounded-xl ring-1 ring-slate-200">
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {vacantRooms.map((r) => (
                        <tr key={r.room_number}>
                          <td className="px-4 py-2.5 font-medium text-slate-800">ห้อง {r.room_number}</td>
                          <td className="px-4 py-2.5 text-right text-slate-900">
                            {Number(r.base_rent) > 0 ? `${formatBaht(r.base_rent)}/เดือน` : "สอบถาม"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-20 rounded-2xl bg-white p-5 ring-1 ring-slate-200">
              {disc && (
                <div className="mb-4 rounded-xl bg-emerald-50 p-3 text-center text-sm font-medium text-emerald-700">
                  🎁 จองผ่าน Chao-Dee<br />รับส่วนลดเดือนแรก {disc}
                </div>
              )}
              <h2 className="mb-3 font-semibold text-slate-900">สนใจที่พักนี้?</h2>
              <LeadForm listingId={l.id} discountText={disc} />

              {(l.contact_phone || l.contact_line) && (
                <div className="mt-4 border-t border-slate-100 pt-4 text-sm">
                  <p className="mb-1 text-slate-400">หรือติดต่อโดยตรง</p>
                  {l.contact_phone && (
                    <a href={`tel:${l.contact_phone}`} className="block text-indigo-600 hover:text-indigo-700">
                      📞 {l.contact_phone}
                    </a>
                  )}
                  {l.contact_line && <p className="text-slate-600">💬 LINE: {l.contact_line}</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <footer className="bg-slate-900 py-8 text-center text-xs text-slate-400">
        <p>ประกาศบน Chao-Dee Rent · เจ้าของใช้ Chao-Dee จัดการหอพักครบวงจร · chao-dee.com</p>
      </footer>
    </div>
  );
}
