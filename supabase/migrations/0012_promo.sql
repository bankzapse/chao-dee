-- 0012_promo.sql — คูปองส่วนลดสำหรับค่าแพ็คเกจ

create table if not exists public.promo_codes (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  description text not null default '',
  percent_off int,                       -- ส่วนลดเป็น % (1–100)
  amount_off  numeric(10,2),             -- หรือส่วนลดเป็นบาท (ใช้อย่างใดอย่างหนึ่ง)
  active      boolean not null default true,
  expires_at  date,
  max_uses    int,                       -- null = ไม่จำกัด
  used_count  int not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.promo_codes enable row level security;
-- ไม่มี policy สำหรับ authenticated — ตรวจสอบ/ใช้/จัดการผ่าน service role เท่านั้น

-- เก็บคูปองที่ใช้กับการชำระแต่ละครั้ง
alter table public.subscription_payments
  add column if not exists promo_code text not null default '',
  add column if not exists discount numeric(10,2) not null default 0;
