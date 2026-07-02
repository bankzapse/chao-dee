-- =============================================================
-- RentFlow — MVP 3: LINE OA (เชื่อมผู้เช่า + ประกาศ)
-- =============================================================

-- รหัสเชื่อมบัญชี LINE ต่อผู้เช่า (ผู้เช่าพิมพ์รหัสนี้ให้ OA เพื่อผูกบัญชี)
alter table public.tenants
  add column if not exists line_link_code text not null default '';

create index if not exists tenants_line_user_idx on public.tenants(line_user_id);
create index if not exists tenants_link_code_idx on public.tenants(line_link_code);

-- ประกาศ/ข่าวสาร
create table public.announcements (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  title       text not null,
  body        text not null default '',
  sent_at     timestamptz,                 -- null = ยังไม่ส่ง (ฉบับร่าง)
  recipients  int not null default 0,      -- จำนวนผู้รับที่ส่งสำเร็จ
  created_at  timestamptz not null default now()
);
create index announcements_org_idx on public.announcements(org_id);

alter table public.announcements enable row level security;
create policy "announcements_all" on public.announcements
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
