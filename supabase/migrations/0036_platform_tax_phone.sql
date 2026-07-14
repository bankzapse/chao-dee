-- 0036_platform_tax_phone.sql
-- เบอร์โทรติดต่อของบริษัท (แสดงในข้อมูลใบกำกับภาษี/ใบเสร็จ)
alter table public.platform_settings
  add column if not exists tax_phone text not null default '';
