-- 0025_listing_promotions.sql
-- ซื้อ "โปรโมท" ประกาศ (Featured) — บริการเสริมแบบเก็บเงิน (ใครมีประกาศก็ซื้อได้)
-- เจ้าของส่งคำขอ+แนบสลิป → เจ้าของระบบอนุมัติ → ประกาศถูกดันขึ้นบนสุด จนถึงวันหมดอายุ

create table if not exists public.listing_promotions (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  listing_id  uuid not null references public.property_listings(id) on delete cascade,
  days        int not null default 7,
  amount      numeric not null default 0,
  method      text not null default 'promptpay',
  slip_path   text not null default '',
  status      text not null default 'pending',  -- pending | active | rejected
  starts_at   date,
  expires_at  date,
  note        text not null default '',
  created_at  timestamptz not null default now()
);
create index if not exists listing_promotions_org_idx on public.listing_promotions(org_id);
create index if not exists listing_promotions_listing_idx on public.listing_promotions(listing_id);
create index if not exists listing_promotions_status_idx on public.listing_promotions(status);

alter table public.listing_promotions enable row level security;

drop policy if exists "listing_promotions_all" on public.listing_promotions;
create policy "listing_promotions_all" on public.listing_promotions
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
