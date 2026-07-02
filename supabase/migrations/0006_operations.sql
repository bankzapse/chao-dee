-- =============================================================
-- RentFlow — MVP 4: แจ้งซ่อม + พัสดุ + ยานพาหนะ
-- =============================================================

create type maintenance_status as enum ('open', 'in_progress', 'done', 'cancelled');
create type parcel_status as enum ('pending', 'picked_up');
create type vehicle_type as enum ('car', 'motorcycle', 'other');

-- ---------- แจ้งซ่อม ----------
create table public.maintenance_requests (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations(id) on delete cascade,
  room_id      uuid references public.rooms(id) on delete set null,
  tenant_id    uuid references public.tenants(id) on delete set null,
  title        text not null,
  description  text not null default '',
  status       maintenance_status not null default 'open',
  source       text not null default 'staff',   -- 'staff' | 'line'
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index maintenance_org_idx on public.maintenance_requests(org_id, status);

-- ---------- พัสดุ ----------
create table public.parcels (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations(id) on delete cascade,
  room_id      uuid references public.rooms(id) on delete set null,
  tenant_id    uuid references public.tenants(id) on delete set null,
  recipient    text not null default '',
  carrier      text not null default '',        -- ขนส่ง เช่น Kerry, Flash
  tracking_no  text not null default '',
  status       parcel_status not null default 'pending',
  received_at  date not null,
  picked_up_at date,
  note         text not null default '',
  created_at   timestamptz not null default now()
);
create index parcels_org_idx on public.parcels(org_id, status);

-- ---------- ยานพาหนะ ----------
create table public.vehicles (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations(id) on delete cascade,
  tenant_id    uuid references public.tenants(id) on delete set null,
  room_id      uuid references public.rooms(id) on delete set null,
  plate        text not null,
  vehicle_type vehicle_type not null default 'car',
  brand        text not null default '',
  color        text not null default '',
  sticker_no   text not null default '',
  note         text not null default '',
  created_at   timestamptz not null default now()
);
create index vehicles_org_idx on public.vehicles(org_id);

-- ---------- RLS ----------
alter table public.maintenance_requests enable row level security;
alter table public.parcels              enable row level security;
alter table public.vehicles             enable row level security;

create policy "maintenance_all" on public.maintenance_requests
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

create policy "parcels_all" on public.parcels
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

create policy "vehicles_all" on public.vehicles
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
