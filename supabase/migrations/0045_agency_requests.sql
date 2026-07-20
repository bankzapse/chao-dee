-- 0045_agency_requests.sql
-- Phase 2: คำขอ "ให้เราหาห้องให้" จากผู้เช่า (ฝั่ง /rent) — ทีมนายหน้ารับไปจับคู่

create table if not exists public.agency_requests (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default '',
  phone       text not null default '',
  province    text not null default '',
  district    text not null default '',
  budget_min  numeric(10,2) not null default 0,
  budget_max  numeric(10,2) not null default 0,
  occupants   int not null default 1,
  move_in     date,
  note        text not null default '',
  -- new | contacted | matched | closed
  status      text not null default 'new',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists agency_requests_status_idx on public.agency_requests(status);
create index if not exists agency_requests_created_idx on public.agency_requests(created_at desc);

alter table public.agency_requests enable row level security;
-- ไม่มี policy → เข้าถึงได้เฉพาะ service role (ฟอร์มสาธารณะเขียนผ่าน server action, Console อ่านผ่าน admin)
