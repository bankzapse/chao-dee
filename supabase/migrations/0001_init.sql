-- =============================================================
-- RentFlow — MVP 1 schema
-- อาคาร / ห้อง / ผู้เช่า / สัญญา / ค่าใช้จ่าย + องค์กร + สิทธิ์ผู้ใช้
-- =============================================================

create extension if not exists "pgcrypto";

-- ---------- Enums ----------
create type room_status as enum ('vacant', 'occupied', 'reserved', 'maintenance');
create type contract_status as enum ('active', 'ended', 'terminated');
create type member_role as enum ('owner', 'admin', 'staff');

-- ---------- Organizations (1 เจ้าของ = 1 องค์กร) ----------
create table public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

-- ---------- Profiles (ผูกกับ auth.users) ----------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  org_id      uuid not null references public.organizations(id) on delete cascade,
  full_name   text not null default '',
  role        member_role not null default 'owner',
  created_at  timestamptz not null default now()
);
create index profiles_org_id_idx on public.profiles(org_id);

-- ---------- Buildings (อาคาร/สาขา ไม่จำกัด) ----------
create table public.buildings (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  name        text not null,
  address     text not null default '',
  note        text not null default '',
  created_at  timestamptz not null default now()
);
create index buildings_org_id_idx on public.buildings(org_id);

-- ---------- Rooms (ห้องพัก ไม่จำกัด) ----------
create table public.rooms (
  id                uuid primary key default gen_random_uuid(),
  building_id       uuid not null references public.buildings(id) on delete cascade,
  room_number       text not null,
  floor             int not null default 1,
  size_sqm          numeric(8,2) not null default 0,
  base_rent         numeric(12,2) not null default 0,
  water_rate        numeric(10,2) not null default 0,   -- บาท/หน่วย
  electricity_rate  numeric(10,2) not null default 0,   -- บาท/หน่วย
  status            room_status not null default 'vacant',
  note              text not null default '',
  created_at        timestamptz not null default now(),
  unique (building_id, room_number)
);
create index rooms_building_id_idx on public.rooms(building_id);

-- ---------- Tenants (ผู้เช่า) ----------
create table public.tenants (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations(id) on delete cascade,
  full_name     text not null,
  phone         text not null default '',
  email         text not null default '',
  id_card       text not null default '',
  line_user_id  text not null default '',   -- เตรียมไว้เชื่อม LINE ใน MVP 3
  note          text not null default '',
  created_at    timestamptz not null default now()
);
create index tenants_org_id_idx on public.tenants(org_id);

-- ---------- Contracts (สัญญาเช่า) ----------
create table public.contracts (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizations(id) on delete cascade,
  room_id         uuid not null references public.rooms(id) on delete restrict,
  tenant_id       uuid not null references public.tenants(id) on delete restrict,
  start_date      date not null,
  end_date        date,
  rent_amount     numeric(12,2) not null default 0,
  deposit_amount  numeric(12,2) not null default 0,
  status          contract_status not null default 'active',
  note            text not null default '',
  created_at      timestamptz not null default now()
);
create index contracts_org_id_idx on public.contracts(org_id);
create index contracts_room_id_idx on public.contracts(room_id);
create index contracts_tenant_id_idx on public.contracts(tenant_id);

-- ---------- Building expenses (ค่าใช้จ่ายอาคาร) ----------
create table public.building_expenses (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations(id) on delete cascade,
  building_id   uuid not null references public.buildings(id) on delete cascade,
  category      text not null default 'อื่นๆ',
  amount        numeric(12,2) not null default 0,
  expense_date  date not null,
  note          text not null default '',
  created_at    timestamptz not null default now()
);
create index building_expenses_org_id_idx on public.building_expenses(org_id);
create index building_expenses_building_id_idx on public.building_expenses(building_id);

-- ---------- Documents (เอกสารห้อง/ผู้เช่า/สัญญา) ----------
create table public.documents (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations(id) on delete cascade,
  entity_type   text not null,           -- 'room' | 'tenant' | 'contract'
  entity_id     uuid not null,
  name          text not null,
  storage_path  text not null,           -- path ใน Supabase Storage bucket 'documents'
  created_at    timestamptz not null default now()
);
create index documents_entity_idx on public.documents(entity_type, entity_id);
create index documents_org_id_idx on public.documents(org_id);
