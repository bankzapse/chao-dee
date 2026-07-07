-- 0022_packages_admins.sql
--  1) ราคาแพ็คเกจที่ owner แก้ไขได้ (override ค่า default ในโค้ด)
--  2) ระบบ Admin: owner สร้างแอดมินย่อย + กำหนดสิทธิ์เข้าถึงหน้า owner ได้

-- ── 1) ราคาแพ็คเกจ ──────────────────────────────────────────────
create table if not exists public.package_prices (
  slug                   text primary key,
  price_monthly          numeric(12,2),
  price_yearly_per_month numeric(12,2),
  price_yearly_total     numeric(12,2),
  updated_at             timestamptz not null default now()
);
alter table public.package_prices enable row level security;
drop policy if exists "package_prices_read" on public.package_prices;
create policy "package_prices_read" on public.package_prices
  for select using (true); -- ราคาเปิดอ่านสาธารณะ (หน้าแรก/ต่ออายุ) — เขียนผ่าน service-role เท่านั้น

-- ── 2) Admin roles / permissions ────────────────────────────────
alter table public.profiles
  add column if not exists admin_role text,                        -- 'owner' | 'admin' | null
  add column if not exists admin_perms text[] not null default '{}';

-- ผู้ที่เป็น platform admin อยู่แล้ว = เจ้าของระบบเต็มสิทธิ์
update public.profiles set admin_role = 'owner'
  where is_platform_admin = true and admin_role is null;
