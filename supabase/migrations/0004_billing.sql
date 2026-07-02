-- =============================================================
-- RentFlow — MVP 2: จดมิเตอร์ + บิล + ชำระเงิน + PromptPay
-- =============================================================

-- PromptPay + ตั้งค่าบิลระดับองค์กร
alter table public.organizations
  add column if not exists promptpay_id text not null default '',      -- เบอร์โทร/เลขบัตร PromptPay
  add column if not exists promptpay_name text not null default '',
  add column if not exists invoice_note text not null default '';       -- ข้อความท้ายบิล

create type invoice_status as enum ('unpaid', 'partial', 'paid', 'void');
create type payment_method as enum ('cash', 'transfer', 'promptpay', 'other');

-- ---------- ค่ามิเตอร์ (จดต่อห้องต่อรอบเดือน) ----------
create table public.meter_readings (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.organizations(id) on delete cascade,
  room_id        uuid not null references public.rooms(id) on delete cascade,
  period         text not null,                    -- 'YYYY-MM'
  water_value    numeric(12,2) not null default 0, -- เลขมิเตอร์น้ำ ณ สิ้นรอบ
  electric_value numeric(12,2) not null default 0, -- เลขมิเตอร์ไฟ ณ สิ้นรอบ
  reading_date   date not null,
  photo_path     text not null default '',         -- รูปมิเตอร์ (เตรียมไว้ให้ AI ใน MVP 5)
  note           text not null default '',
  created_at     timestamptz not null default now(),
  unique (room_id, period)
);
create index meter_readings_org_idx on public.meter_readings(org_id);
create index meter_readings_room_period_idx on public.meter_readings(room_id, period);

-- ---------- ใบแจ้งหนี้ ----------
create table public.invoices (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizations(id) on delete cascade,
  contract_id     uuid references public.contracts(id) on delete set null,
  room_id         uuid not null references public.rooms(id) on delete cascade,
  tenant_id       uuid references public.tenants(id) on delete set null,
  period          text not null,                   -- 'YYYY-MM'
  issue_date      date not null,
  due_date        date not null,
  water_units     numeric(12,2) not null default 0,
  water_amount    numeric(12,2) not null default 0,
  electric_units  numeric(12,2) not null default 0,
  electric_amount numeric(12,2) not null default 0,
  rent_amount     numeric(12,2) not null default 0,
  other_amount    numeric(12,2) not null default 0,
  discount        numeric(12,2) not null default 0,
  total_amount    numeric(12,2) not null default 0,
  paid_amount     numeric(12,2) not null default 0,
  status          invoice_status not null default 'unpaid',
  note            text not null default '',
  created_at      timestamptz not null default now(),
  unique (room_id, period)
);
create index invoices_org_idx on public.invoices(org_id);
create index invoices_status_idx on public.invoices(org_id, status);
create index invoices_period_idx on public.invoices(org_id, period);

-- ---------- รายการย่อยเพิ่มเติมในบิล (ค่าปรับ/ค่าส่วนกลาง ฯลฯ) ----------
create table public.invoice_items (
  id           uuid primary key default gen_random_uuid(),
  invoice_id   uuid not null references public.invoices(id) on delete cascade,
  description  text not null,
  amount       numeric(12,2) not null default 0,
  created_at   timestamptz not null default now()
);
create index invoice_items_invoice_idx on public.invoice_items(invoice_id);

-- ---------- การชำระเงิน ----------
create table public.payments (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  invoice_id  uuid not null references public.invoices(id) on delete cascade,
  amount      numeric(12,2) not null default 0,
  method      payment_method not null default 'transfer',
  paid_at     date not null,
  slip_path   text not null default '',
  note        text not null default '',
  created_at  timestamptz not null default now()
);
create index payments_org_idx on public.payments(org_id);
create index payments_invoice_idx on public.payments(invoice_id);

-- ---------- RLS ----------
alter table public.meter_readings enable row level security;
alter table public.invoices       enable row level security;
alter table public.invoice_items  enable row level security;
alter table public.payments       enable row level security;

create policy "meter_readings_all" on public.meter_readings
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

create policy "invoices_all" on public.invoices
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

create policy "payments_all" on public.payments
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

create policy "invoice_items_all" on public.invoice_items
  for all using (
    exists (
      select 1 from public.invoices i
      where i.id = invoice_items.invoice_id and i.org_id = public.current_org_id()
    )
  )
  with check (
    exists (
      select 1 from public.invoices i
      where i.id = invoice_items.invoice_id and i.org_id = public.current_org_id()
    )
  );

-- ---------- อัปเดตยอดชำระ + สถานะบิล อัตโนมัติเมื่อมีการชำระ ----------
create or replace function public.recompute_invoice_paid()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  inv_id uuid := coalesce(new.invoice_id, old.invoice_id);
  total_paid numeric(12,2);
  inv_total numeric(12,2);
begin
  select coalesce(sum(amount), 0) into total_paid from public.payments where invoice_id = inv_id;
  select total_amount into inv_total from public.invoices where id = inv_id;

  update public.invoices
    set paid_amount = total_paid,
        status = (case
          when total_paid <= 0 then 'unpaid'
          when total_paid < inv_total then 'partial'
          else 'paid'
        end)::invoice_status
    where id = inv_id and status <> 'void';

  return null;
end;
$$;

drop trigger if exists on_payment_change on public.payments;
create trigger on_payment_change
  after insert or update or delete on public.payments
  for each row execute function public.recompute_invoice_paid();

-- storage bucket สำหรับสลิป/รูปมิเตอร์
insert into storage.buckets (id, name, public)
values ('slips', 'slips', false)
on conflict (id) do nothing;

create policy "slips_storage_all" on storage.objects
  for all
  using (bucket_id = 'slips' and auth.uid() is not null)
  with check (bucket_id = 'slips' and auth.uid() is not null);
