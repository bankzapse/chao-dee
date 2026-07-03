-- 0010_team.sql — ระบบเชิญทีมงานเข้าร่วมกิจการ (org)
-- เจ้าของ/แอดมินเชิญด้วยเบอร์โทร เมื่อผู้ถูกเชิญสมัครด้วยเบอร์นั้น
-- จะเข้าร่วมกิจการเดิมเป็นทีมงานแทนการสร้างกิจการใหม่

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  phone text not null,
  full_name text not null default '',
  role text not null default 'staff' check (role in ('admin', 'staff')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  invited_by uuid,
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

-- ห้ามเชิญเบอร์เดิมซ้ำในกิจการเดียวกันขณะยัง pending
create unique index if not exists invitations_pending_uq
  on public.invitations (org_id, phone) where status = 'pending';
create index if not exists invitations_phone_pending_idx
  on public.invitations (phone) where status = 'pending';

alter table public.invitations enable row level security;

create policy "inv_select" on public.invitations
  for select using (org_id = public.current_org_id());
create policy "inv_insert" on public.invitations
  for insert with check (org_id = public.current_org_id());
create policy "inv_update" on public.invitations
  for update using (org_id = public.current_org_id());
create policy "inv_delete" on public.invitations
  for delete using (org_id = public.current_org_id());

-- ปรับ trigger สมัครสมาชิก: ถ้าเบอร์นี้ถูกเชิญไว้ → เข้าร่วมกิจการนั้นเป็นทีมงาน
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
  inv public.invitations;
begin
  -- มีคำเชิญค้างอยู่สำหรับเบอร์นี้ไหม
  select * into inv from public.invitations
   where phone = new.phone and status = 'pending'
   order by created_at desc limit 1;

  if inv.id is not null then
    insert into public.profiles (id, org_id, full_name, phone, role)
    values (
      new.id, inv.org_id,
      coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), inv.full_name),
      coalesce(new.phone, ''), inv.role::member_role
    );
    update public.invitations
       set status = 'accepted', accepted_at = now()
     where id = inv.id;
    return new;
  end if;

  -- ปกติ: สร้างกิจการใหม่ + ทดลองใช้ 30 วัน
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
