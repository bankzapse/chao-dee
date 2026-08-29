-- 0053_custom_roles.sql
-- Custom RBAC: เจ้าของสร้าง "ประเภททีมงาน" (role) เอง + กำหนด permission ต่อโมดูล
-- และทีมงานล็อกอินด้วย username/password (เจ้าของสร้างบัญชีให้)
--
-- โมเดล 2 ชั้น (ไม่ทับของเดิม):
--   • profiles.role  (enum owner/admin/staff) = ชั้นหยาบ ใช้กับ RLS + org-isolation เหมือนเดิม
--     ทีมงานที่ใช้ custom role จะเป็น role='staff' (ฐานสิทธิ์ต่ำสุด) แล้วเพิ่มสิทธิ์ละเอียดผ่าน role_id
--   • profiles.role_id → roles.permissions[] = ชั้นละเอียด บังคับใน app-layer (server action + UI)
--   • owner = สิทธิ์เต็มโดยปริยาย (ไม่ต้องมี role_id)
--
-- ROLLBACK:
--   alter table public.profiles drop column if exists role_id;
--   alter table public.profiles drop column if exists username;
--   drop table if exists public.roles;
--   (คืน guard เดิม: ดู 0051_profiles_guard.sql)

-- ── 1) ตาราง roles (ประเภททีมงานที่เจ้าของสร้างเอง ต่อ org) ───────────────
create table if not exists public.roles (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  name        text not null,                       -- ชื่อที่เจ้าของตั้ง เช่น "แม่บ้าน", "เก็บเงิน"
  permissions text[] not null default '{}',        -- เช่น {'invoices:view','invoices:edit','tenants:view'}
  created_at  timestamptz not null default now(),
  unique (org_id, name)
);
create index if not exists roles_org_idx on public.roles(org_id);

-- ── 2) profiles: role_id (custom role) + username (ล็อกอินทีมงาน) ─────────
alter table public.profiles
  add column if not exists role_id  uuid references public.roles(id) on delete set null,
  add column if not exists username text;
-- username ต้องไม่ซ้ำทั้งระบบ (ใช้เป็นตัวระบุตอนล็อกอิน map → auth email)
create unique index if not exists profiles_username_key
  on public.profiles(username) where username is not null;

-- ── 3) RLS ตาราง roles: อ่านได้ทั้ง org · จัดการได้เฉพาะเจ้าของ ───────────
alter table public.roles enable row level security;
drop policy if exists "roles_select" on public.roles;
create policy "roles_select" on public.roles
  for select using (org_id = public.current_org_id());
drop policy if exists "roles_write_owner" on public.roles;
create policy "roles_write_owner" on public.roles
  for all
  using (org_id = public.current_org_id() and public.current_member_role() = 'owner')
  with check (org_id = public.current_org_id() and public.current_member_role() = 'owner');

-- ── 4) กัน privilege escalation: pin role_id + username เพิ่ม (ต่อยอด 0051) ─
-- ผู้ใช้ทั่วไป (PostgREST authenticated/anon) ห้ามแก้คอลัมน์สิทธิ์ของตัวเอง
-- รวม role_id/username ที่เพิ่มใหม่ (ตั้งค่าได้เฉพาะ service_role ตอนเจ้าของสร้างบัญชี)
create or replace function public.profiles_guard_privileged_cols()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.org_id   := old.org_id;
    new.role     := old.role;
    new.id       := old.id;
    new.role_id  := old.role_id;
    new.username := old.username;
  end if;
  return new;
end;
$$;
-- trigger เดิมจาก 0051 ยังผูกกับฟังก์ชันนี้อยู่ (create or replace ไม่ต้องสร้าง trigger ใหม่)
