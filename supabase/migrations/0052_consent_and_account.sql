-- 0052_consent_and_account.sql
-- PDPA/App Store: บันทึกการยินยอม (proof-of-consent) + รองรับผู้ใช้ลบบัญชีตัวเอง
--
-- บริบท: ตอนสมัครสมาชิกมี clickwrap ("การสมัครถือว่ายอมรับข้อกำหนด+นโยบายความเป็นส่วนตัว")
-- แต่ไม่เคย "บันทึก" การยินยอมไว้ และไม่มีช่องทางให้ผู้ใช้ลบบัญชีเอง (ข้อบังคับ Apple App Store)
-- ตารางนี้เก็บหลักฐานการยินยอม; การลบบัญชีทำผ่าน service-role ใน /settings/delete-account
--
-- ROLLBACK: drop table if exists public.user_consents;

create table if not exists public.user_consents (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  kind         text not null,               -- ชนิดการยินยอม เช่น 'terms_privacy'
  version      text not null,               -- เวอร์ชันข้อกำหนด/นโยบาย ณ ตอนยินยอม
  ip           text,                        -- IP ผู้ยินยอม (best-effort, อาจว่าง)
  accepted_at  timestamptz not null default now(),
  -- ยินยอมครั้งเดียวต่อ (ผู้ใช้, ชนิด, เวอร์ชัน) — กันแถวซ้ำเมื่อล็อกอินหลายครั้ง
  unique (user_id, kind, version)
);

create index if not exists user_consents_user_idx on public.user_consents(user_id);

alter table public.user_consents enable row level security;

-- อ่านได้เฉพาะเจ้าของแถว; การบันทึกทำผ่าน service-role (บายพาส RLS) จึงไม่ต้องมี insert policy
drop policy if exists "user_consents_select_own" on public.user_consents;
create policy "user_consents_select_own" on public.user_consents
  for select using (user_id = auth.uid());
