-- 0038_org_tax_phone.sql
-- เบอร์โทรติดต่อของสมาชิก (แสดงในข้อมูลใบกำกับภาษี)
alter table public.organizations
  add column if not exists tax_phone text not null default '';
