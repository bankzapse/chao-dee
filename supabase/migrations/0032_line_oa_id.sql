-- 0032_line_oa_id.sql
-- LINE OA ของเจ้าของหอ (@id) — ระบบสร้าง QR แอดเพื่อนให้ผู้เช่าสแกน (พิมพ์ติดหอได้)
alter table public.organizations
  add column if not exists line_oa_id text not null default '';
