-- 0034_platform_settings.sql
-- ช่องทางรับเงินของบริษัท (PromptPay / บัญชีธนาคาร) ที่เจ้าของหอสแกนจ่ายค่าสมาชิกเข้ามา
-- แก้ไขได้ใน Chao-Dee Console (แทนการฝังใน env)
create table if not exists public.platform_settings (
  id                 int primary key default 1,
  promptpay_id       text not null default '',
  promptpay_name     text not null default '',
  bank_name          text not null default '',
  bank_account_no    text not null default '',
  bank_account_name  text not null default '',
  updated_at         timestamptz not null default now(),
  constraint platform_settings_singleton check (id = 1)
);
insert into public.platform_settings (id) values (1) on conflict (id) do nothing;

alter table public.platform_settings enable row level security;
drop policy if exists "platform_settings_read" on public.platform_settings;
create policy "platform_settings_read" on public.platform_settings
  for select using (true); -- อ่านสาธารณะ (หน้าต่ออายุ) — เขียนผ่าน service-role เท่านั้น
