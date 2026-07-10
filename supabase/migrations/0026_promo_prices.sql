-- 0026_promo_prices.sql
-- ราคาโปรโมทที่เจ้าของระบบแก้เองได้ (override ค่า default ในโค้ด) — เหมือน package_prices
create table if not exists public.promo_prices (
  days        int primary key,           -- 7 | 30 | 90 (ตาม PROMO_PLANS)
  price       numeric not null,
  updated_at  timestamptz not null default now()
);
alter table public.promo_prices enable row level security;
drop policy if exists "promo_prices_read" on public.promo_prices;
create policy "promo_prices_read" on public.promo_prices
  for select using (true); -- อ่านสาธารณะ (หน้าโปรโมท) — เขียนผ่าน service-role เท่านั้น

insert into public.promo_prices (days, price) values (7, 99), (30, 299), (90, 799)
on conflict (days) do nothing;
