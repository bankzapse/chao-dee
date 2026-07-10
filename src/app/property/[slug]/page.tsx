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

async function getListing(slug: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("property_listings")
    .select("*")
    .eq("slug", slug)
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
  if (!l) return { title: "ไม่พบที่พัก | Chao-Dee" };
  const where = [l.district, l.province].filter(Boolean).join(" ");
  const title = `${l.title} ${PROPERTY_TYPE_LABEL[l.property_type]}${where ? " " + where : ""} | Chao-Dee`;
  const description =
    (l.description || `${PROPERTY_TYPE_LABEL[l.property_type]}ให้เช่า ${where}`).slice(0, 155);
  return {
    title,
    description,
    alternates: { canonical: `https://www.chao-dee.com/property/${l.slug}` },
    openGraph: { title, description, images: l.cover_image ? [l.cover_image] : [] },
  };
}

export default async function PropertyDetailPage({
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
  const rents = vacantRooms.map((r) => Number(r.base_rent)).filter((n) => n > 0);
  const minRent = rents.length ? Math.min(...rents) : 0;
  const maxRent = rents.length ? Math.max(...rents) : 0;
  const disc = discountLabel(l.first_month_discount_type, l.first_month_discount_value);
  const gallery = [l.cover_image, ...((photos ?? []) as { url: string }[]).map((p) => p.url)].filter(
    Boolean
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <Link href="/property" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800">
            ← ประกาศทั้งหมด
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <BrandMark size={30} />
            <span className="font-bold text-slate-900">Chao-Dee</span>
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-6">
        {/* cover */}
        <div className="overflow-hidden rounded-2xl bg-slate-100">
          {l.cover_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={l.cover_image} alt={l.title} className="h-64 w-full object-cover sm:h-80" />
          ) : (
            <div className="flex h-64 w-full items-center justify-center text-6xl text-slate-300 sm:h-80">
              🏢
            </div>
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
          {/* main */}
          <div className="lg:col-span-2">
            <p className="text-sm text-indigo-600">{PROPERTY_TYPE_LABEL[l.property_type]}</p>
            <h1 className="mt-1 text-2xl font-extrabold text-slate-900">{l.title}</h1>
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
                <p className="text-lg font-bold text-emerald-600">{vacantRooms.length} ห้อง</p>
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

            {vacantRooms.length > 0 && (
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

          {/* sidebar: contact + discount */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 rounded-2xl bg-white p-5 ring-1 ring-slate-200">
              {disc && (
                <div className="mb-4 rounded-xl bg-emerald-50 p-3 text-center text-sm font-medium text-emerald-700">
                  🎁 จองผ่าน Chao-Dee<br />รับส่วนลดเดือนแรก {disc}
                </div>
              )}
              <h2 className="mb-3 font-semibold text-slate-900">สนใจห้องนี้?</h2>
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

      <footer className="border-t border-slate-100 bg-white py-8 text-center text-xs text-slate-400">
        <p>ประกาศนี้อยู่บนระบบ Chao-Dee · เจ้าของหอใช้ Chao-Dee จัดการหอพักครบวงจร · chao-dee.com</p>
      </footer>
    </div>
  );
}
