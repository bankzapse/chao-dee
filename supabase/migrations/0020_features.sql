-- 0020_features.sql — ฟีเจอร์ตามเป้าหมาย (non-destructive, ใช้ add column if not exists)
--  1) ค่าน้ำแบบเหมาจ่าย/คน
--  2) สัญญา: จำนวนผู้พัก + ค่าปรับล่าช้า + เงื่อนไข (แก้ไขได้)
--  3) เอกสารผู้เช่า (รูปบัตร ปชช./ทะเบียนบ้าน)
--  4) ลบอาคารได้ (FK contracts.room_id restrict → cascade)

-- ── 1) ค่าน้ำเหมาจ่าย/คน ─────────────────────────────────────────────
alter table public.rooms
  add column if not exists water_mode text not null default 'unit',            -- 'unit' | 'flat_person'
  add column if not exists water_flat_per_person numeric(10,2) not null default 0;

-- ── 2) สัญญา: ผู้พัก + ค่าปรับ + เงื่อนไข ─────────────────────────────
alter table public.contracts
  add column if not exists occupant_count int not null default 1,
  add column if not exists late_fee numeric(12,2) not null default 0,          -- ค่าปรับชำระล่าช้า (บาท)
  add column if not exists late_fee_mode text not null default 'once',         -- 'once' (ต่อครั้ง) | 'per_day' (ต่อวัน)
  add column if not exists terms text not null default '';                     -- เงื่อนไข/ข้อตกลงเพิ่มเติม

-- invoices: บันทึกจำนวนคน + ค่าปรับที่คิด เพื่อความโปร่งใสของบิล
alter table public.invoices
  add column if not exists occupant_count int not null default 0,
  add column if not exists late_fee numeric(12,2) not null default 0;

-- ── 3) เอกสารผู้เช่า (เก็บใน storage bucket 'documents' ที่มีอยู่แล้ว) ──
create table if not exists public.tenant_documents (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  doc_type    text not null default 'other',   -- 'id_card' | 'house_reg' | 'contract' | 'other'
  file_path   text not null,
  note        text not null default '',
  created_at  timestamptz not null default now()
);
alter table public.tenant_documents enable row level security;
drop policy if exists "tenant_documents_all" on public.tenant_documents;
create policy "tenant_documents_all" on public.tenant_documents
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

-- ── 4) ลบอาคารได้: contracts.room_id restrict → cascade ─────────────
alter table public.contracts drop constraint if exists contracts_room_id_fkey;
alter table public.contracts
  add constraint contracts_room_id_fkey
  foreign key (room_id) references public.rooms(id) on delete cascade;
