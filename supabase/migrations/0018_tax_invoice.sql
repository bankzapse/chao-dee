-- 0018_tax_invoice.sql — รองรับใบกำกับภาษี (เมื่อจด VAT)

-- ข้อมูลภาษีของผู้ซื้อ (สำหรับออกใบกำกับภาษีให้ลูกค้า)
alter table public.organizations
  add column if not exists tax_id      text not null default '',
  add column if not exists tax_name    text not null default '',   -- ชื่อผู้เสียภาษี (ถ้าต่างจากชื่อกิจการ)
  add column if not exists tax_address text not null default '',
  add column if not exists tax_branch  text not null default 'สำนักงานใหญ่';

-- เลขที่ใบกำกับภาษี ผูกกับการชำระ (กำหนดตอนยืนยันเมื่อเปิด VAT)
alter table public.subscription_payments
  add column if not exists tax_invoice_no text not null default '';

-- ลำดับเลขที่ใบกำกับภาษี (unique, running)
create sequence if not exists public.tax_invoice_seq;

create or replace function public.next_tax_invoice_no()
returns text
language sql
security definer
set search_path = public
as $$
  select 'TIV-' || to_char(now(), 'YY') || '-' || to_char(nextval('public.tax_invoice_seq'), 'FM000000');
$$;

grant execute on function public.next_tax_invoice_no() to authenticated, service_role;
