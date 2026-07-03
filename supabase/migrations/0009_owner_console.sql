-- =============================================================
-- ChaoDee — Owner Console: การชำระค่าสมาชิก + บังคับสิทธิ์
-- =============================================================

create type sub_payment_status as enum ('pending', 'verified', 'rejected');

create table public.subscription_payments (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations(id) on delete cascade,
  package_slug  text not null default 'pro',
  cycle         billing_cycle not null default 'monthly',
  amount        numeric(10,2) not null default 0,
  method        payment_method not null default 'transfer',
  paid_at       date not null default current_date,
  period_start  date,
  period_end    date,
  status        sub_payment_status not null default 'pending',
  slip_path     text not null default '',
  note          text not null default '',
  verified_by   uuid references public.profiles(id) on delete set null,
  verified_at   timestamptz,
  created_at    timestamptz not null default now()
);
create index sub_payments_org_idx on public.subscription_payments(org_id);
create index sub_payments_status_idx on public.subscription_payments(status);

alter table public.subscription_payments enable row level security;

-- เจ้าของเห็นของกิจการตัวเอง (สร้างคำขอชำระได้)
create policy "sub_payments_own" on public.subscription_payments
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

-- ฟังก์ชันเช็คว่ากิจการมีสิทธิ์ใช้งานอยู่ไหม (active/trialing + ยังไม่หมดอายุ)
create or replace function public.org_access_active(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.subscriptions s
    where s.org_id = p_org
      and s.status in ('active', 'trialing')
      and (s.expires_at is null or s.expires_at > now())
  );
$$;
