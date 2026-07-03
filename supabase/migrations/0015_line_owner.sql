-- 0015_line_owner.sql — เชื่อม LINE ของเจ้าของหอ เพื่อรับแจ้งเตือน

alter table public.organizations
  add column if not exists owner_line_user_id text not null default '',  -- LINE ของเจ้าของหอ (รับแจ้งเตือน)
  add column if not exists line_link_code     text not null default '';  -- รหัสเชื่อม LINE เจ้าของหอ

create index if not exists org_line_link_code_idx on public.organizations (line_link_code) where line_link_code <> '';
