-- 0037_tax_entity_type.sql
-- ประเภทผู้เสียภาษีของสมาชิก: juristic (นิติบุคคล) | individual (บุคคลธรรมดา)
alter table public.organizations
  add column if not exists tax_entity_type text not null default 'juristic';
