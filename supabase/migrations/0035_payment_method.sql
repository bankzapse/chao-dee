-- 0035_payment_method.sql
-- เลือกช่องทางรับเงินหลัก (promptpay | bank) + ข้อมูลภาษีของบริษัทในแผงเจ้าของระบบ

-- เจ้าของหอ: เลือกวิธีรับเงินหลักที่แสดงในบิลผู้เช่า
alter table public.organizations
  add column if not exists payment_method text not null default 'promptpay';

-- บริษัท (Chao-Dee Console): วิธีรับเงินหลัก + ข้อมูลใบกำกับภาษีของบริษัท
alter table public.platform_settings
  add column if not exists payment_method    text not null default 'promptpay',
  add column if not exists tax_name           text not null default '',
  add column if not exists tax_id             text not null default '',
  add column if not exists tax_address        text not null default '',
  add column if not exists tax_branch         text not null default 'สำนักงานใหญ่';
