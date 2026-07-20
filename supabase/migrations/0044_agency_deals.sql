-- 0044_agency_deals.sql
-- ระบบนายหน้าจัดหาผู้เช่า (โมเดล A: Chao-Dee เป็นนายหน้าเอง) — ค่านายหน้า 1 เดือน

-- ตั้งค่าฝั่งเจ้าของหอ: เปิดใช้บริการ + การยอมรับสัญญา (click-wrap)
alter table public.organizations
  add column if not exists agency_enabled       boolean not null default false,
  add column if not exists agency_agreed_at     timestamptz,
  add column if not exists agency_terms_version text not null default '';

-- ผูกสัญญาเช่ากับ lead ต้นทาง (ใช้พิสูจน์ attribution)
alter table public.contracts
  add column if not exists lead_id uuid;

-- ดีลนายหน้า
create table if not exists public.agency_deals (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references public.organizations(id) on delete cascade,
  lead_id           uuid,
  listing_id        uuid,
  room_id           uuid,
  tenant_id         uuid,
  contract_id       uuid,
  -- new | contacted | viewing | signed | invoiced | paid | cancelled | refunded
  status            text not null default 'new',
  lead_name         text not null default '',
  lead_phone        text not null default '',
  rent_base         numeric(12,2) not null default 0,   -- ค่าเช่า/เดือน ณ วันเซ็น
  commission_rate   numeric(5,2)  not null default 1.0, -- 1.0 = ค่าเช่า 1 เดือน
  commission_amount numeric(12,2) not null default 0,
  slip_path         text not null default '',
  source            text not null default 'rent_marketplace',
  note              text not null default '',
  signed_at         timestamptz,
  invoiced_at       timestamptz,
  paid_at           timestamptz,
  cancelled_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists agency_deals_org_idx    on public.agency_deals(org_id);
create index if not exists agency_deals_status_idx on public.agency_deals(status);
create index if not exists agency_deals_lead_idx   on public.agency_deals(lead_id);

alter table public.agency_deals enable row level security;

-- เจ้าของหอ "อ่าน" ดีลของตัวเองได้เท่านั้น
-- การสร้าง/แก้ไขทำผ่าน service role (Console + server action) เพื่อกันแก้ยอดค่านายหน้าเอง
drop policy if exists "agency_deals_own_select" on public.agency_deals;
create policy "agency_deals_own_select" on public.agency_deals
  for select using (org_id = public.current_org_id());
