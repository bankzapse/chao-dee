-- 0050_agency_lead_unique.sql
-- กันสร้างดีลนายหน้าซ้ำจาก lead เดียวกัน (check-then-insert เดิมมี race)
-- บังคับที่ระดับ DB: 1 lead = 1 ดีล
create unique index if not exists agency_deals_lead_uq
  on public.agency_deals (lead_id)
  where lead_id is not null;
