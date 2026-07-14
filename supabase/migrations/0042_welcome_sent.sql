-- 0042_welcome_sent.sql
-- ธงว่าส่งอีเมลต้อนรับ (onboarding) ให้กิจการนี้แล้วหรือยัง — กันส่งซ้ำ
alter table public.organizations
  add column if not exists welcome_sent boolean not null default false;
