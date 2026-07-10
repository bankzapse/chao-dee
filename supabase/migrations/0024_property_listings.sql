-- 0024_property_listings.sql
-- Marketplace โปรโมทที่พักของสมาชิก (SEO + หา lead) — ลงประกาศได้เฉพาะสมาชิกที่ใช้ระบบเช่าดี
--  1) property_listings — 1 ประกาศ = 1 อาคาร (ดึงห้องว่าง/ราคาจาก rooms อัตโนมัติ)
--  2) listing_photos    — รูปที่พัก
--  3) listing_leads     — ผู้เช่าที่ติดต่อผ่าน Chao-Dee (ใช้คิด conversion/ค่าแนะนำ)

create table if not exists public.property_listings (
  id                          uuid primary key default gen_random_uuid(),
  org_id                      uuid not null references public.organizations(id) on delete cascade,
  building_id                 uuid references public.buildings(id) on delete set null,
  slug                        text unique not null,
  title                       text not null default '',
  property_type               text not null default 'dorm',   -- dorm | condo | apartment
  description                 text not null default '',
  province                    text not null default '',
  district                    text not null default '',
  address                     text not null default '',
  lat                         double precision,
  lng                         double precision,
  cover_image                 text not null default '',
  amenities                   text[] not null default '{}',
  contact_phone               text not null default '',
  contact_line                text not null default '',
  first_month_discount_type   text not null default 'percent', -- percent | baht
  first_month_discount_value  numeric not null default 0,
  is_published                boolean not null default false,
  is_featured                 boolean not null default false,
  featured_until              date,
  created_at                  timestamptz not null default now()
);
create index if not exists property_listings_org_idx on public.property_listings(org_id);
create index if not exists property_listings_pub_idx on public.property_listings(is_published);

create table if not exists public.listing_photos (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references public.property_listings(id) on delete cascade,
  url         text not null,
  sort        int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists listing_photos_listing_idx on public.listing_photos(listing_id);

create table if not exists public.listing_leads (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references public.property_listings(id) on delete cascade,
  org_id      uuid not null references public.organizations(id) on delete cascade,
  name        text not null default '',
  phone       text not null default '',
  message     text not null default '',
  source      text not null default 'web',
  status      text not null default 'new',   -- new | contacted | moved_in | lost
  created_at  timestamptz not null default now()
);
create index if not exists listing_leads_org_idx on public.listing_leads(org_id);
create index if not exists listing_leads_listing_idx on public.listing_leads(listing_id);

-- ---------- RLS (สมาชิกจัดการเฉพาะของ org ตัวเอง; หน้าสาธารณะอ่านผ่าน service-role) ----------
alter table public.property_listings enable row level security;
alter table public.listing_photos    enable row level security;
alter table public.listing_leads     enable row level security;

drop policy if exists "property_listings_all" on public.property_listings;
create policy "property_listings_all" on public.property_listings
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

drop policy if exists "listing_photos_all" on public.listing_photos;
create policy "listing_photos_all" on public.listing_photos
  for all using (
    exists (select 1 from public.property_listings l
            where l.id = listing_id and l.org_id = public.current_org_id())
  )
  with check (
    exists (select 1 from public.property_listings l
            where l.id = listing_id and l.org_id = public.current_org_id())
  );

drop policy if exists "listing_leads_all" on public.listing_leads;
create policy "listing_leads_all" on public.listing_leads
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

-- ---------- storage bucket รูปที่พัก (public เพื่อโชว์บน marketplace/SEO) ----------
insert into storage.buckets (id, name, public)
values ('listings', 'listings', true)
on conflict (id) do nothing;

drop policy if exists "listings_storage_read" on storage.objects;
create policy "listings_storage_read" on storage.objects
  for select using (bucket_id = 'listings');

drop policy if exists "listings_storage_write" on storage.objects;
create policy "listings_storage_write" on storage.objects
  for all
  using (bucket_id = 'listings' and auth.uid() is not null)
  with check (bucket_id = 'listings' and auth.uid() is not null);
