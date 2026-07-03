-- =============================================================
-- ChaoDee — ระบบสมาชิก/แพ็คเกจ (subscriptions) + platform admin
-- =============================================================

-- ผู้ดูแลแพลตฟอร์ม (ทีม ChaoDee) เห็นสมาชิกทุกกิจการ
alter table public.profiles
  add column if not exists is_platform_admin boolean not null default false;

create type subscription_status as enum ('trialing', 'active', 'past_due', 'cancelled', 'expired');
create type billing_cycle as enum ('monthly', 'yearly');

create table public.subscriptions (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations(id) on delete cascade,
  package_slug text not null default 'pro',        -- plus | pro | exclusive
  cycle        billing_cycle not null default 'monthly',
  status       subscription_status not null default 'trialing',
  price        numeric(10,2) not null default 0,
  started_at   timestamptz not null default now(),
  expires_at   timestamptz,
  note         text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (org_id)
);
create index subscriptions_org_idx on public.subscriptions(org_id);
create index subscriptions_status_idx on public.subscriptions(status);

alter table public.subscriptions enable row level security;

-- เจ้าของเห็น/แก้ของกิจการตัวเอง
create policy "subscriptions_own" on public.subscriptions
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

-- ให้ trial 30 วันอัตโนมัติเมื่อสมัครใหม่
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
begin
  insert into public.organizations (name)
  values (coalesce(nullif(new.raw_user_meta_data->>'org_name', ''), 'หอพักของฉัน'))
  returning id into new_org_id;

  insert into public.profiles (id, org_id, full_name, phone, role)
  values (
    new.id, new_org_id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.phone, ''), 'owner'
  );

  insert into public.subscriptions (org_id, package_slug, cycle, status, expires_at)
  values (new_org_id, 'pro', 'monthly', 'trialing', now() + interval '30 days');

  return new;
end;
$$;

-- backfill: กิจการเดิมที่ยังไม่มี subscription → ให้ trial
insert into public.subscriptions (org_id, package_slug, status, expires_at)
select o.id, 'pro', 'trialing', now() + interval '30 days'
from public.organizations o
left join public.subscriptions s on s.org_id = o.id
where s.id is null;
