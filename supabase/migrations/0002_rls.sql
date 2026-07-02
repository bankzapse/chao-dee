-- =============================================================
-- RentFlow — RLS + helpers + signup trigger
-- ทุกตารางเข้าถึงได้เฉพาะข้อมูลในองค์กรของผู้ใช้ที่ล็อกอินอยู่
-- =============================================================

-- helper: org_id ของผู้ใช้ปัจจุบัน
create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from public.profiles where id = auth.uid();
$$;

-- ---------- สร้าง org + profile อัตโนมัติเมื่อสมัครสมาชิก ----------
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

  insert into public.profiles (id, org_id, full_name, role)
  values (
    new.id,
    new_org_id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'owner'
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- เปิด RLS ----------
alter table public.organizations    enable row level security;
alter table public.profiles         enable row level security;
alter table public.buildings        enable row level security;
alter table public.rooms            enable row level security;
alter table public.tenants          enable row level security;
alter table public.contracts        enable row level security;
alter table public.building_expenses enable row level security;
alter table public.documents        enable row level security;

-- organizations: เห็น/แก้เฉพาะองค์กรตัวเอง
create policy "org_select" on public.organizations
  for select using (id = public.current_org_id());
create policy "org_update" on public.organizations
  for update using (id = public.current_org_id());

-- profiles: เห็นคนในองค์กรเดียวกัน
create policy "profiles_select" on public.profiles
  for select using (org_id = public.current_org_id());
create policy "profiles_update" on public.profiles
  for update using (id = auth.uid());

-- ตารางที่ org-scoped ตรงๆ
create policy "buildings_all" on public.buildings
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

create policy "tenants_all" on public.tenants
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

create policy "contracts_all" on public.contracts
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

create policy "building_expenses_all" on public.building_expenses
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

create policy "documents_all" on public.documents
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

-- rooms: org-scoped ผ่าน building
create policy "rooms_all" on public.rooms
  for all using (
    exists (
      select 1 from public.buildings b
      where b.id = rooms.building_id and b.org_id = public.current_org_id()
    )
  )
  with check (
    exists (
      select 1 from public.buildings b
      where b.id = rooms.building_id and b.org_id = public.current_org_id()
    )
  );

-- ---------- Storage bucket สำหรับเอกสาร ----------
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "documents_storage_all" on storage.objects
  for all
  using (bucket_id = 'documents' and auth.uid() is not null)
  with check (bucket_id = 'documents' and auth.uid() is not null);
