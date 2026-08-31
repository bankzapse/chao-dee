-- 0056_slip_txns.sql
-- บันทึกสลิปที่ตรวจแล้ว (กันใช้สลิปซ้ำ) — trans_ref จากบริการตรวจสลิป (EasySlip/SlipOK)
-- unique (org_id, trans_ref) → ถ้าส่งสลิปเดิมซ้ำ insert จะชน (23505) = ปฏิเสธ
--
-- ROLLBACK: drop table if exists public.slip_txns;

create table if not exists public.slip_txns (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  invoice_id  uuid references public.invoices(id) on delete set null,
  trans_ref   text not null,
  amount      numeric(12,2) not null default 0,
  created_at  timestamptz not null default now(),
  unique (org_id, trans_ref)
);
create index if not exists slip_txns_org_idx on public.slip_txns(org_id);

alter table public.slip_txns enable row level security;
-- อ่านได้เฉพาะคนในองค์กร · เขียนผ่าน service-role (webhook) จึงบายพาส RLS
drop policy if exists "slip_txns_select" on public.slip_txns;
create policy "slip_txns_select" on public.slip_txns
  for select using (org_id = public.current_org_id());
