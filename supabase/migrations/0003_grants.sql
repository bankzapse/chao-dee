-- =============================================================
-- Table-level grants ให้ role authenticated / anon
-- (RLS ที่เปิดไว้ใน 0002 ยังคุมการเข้าถึงระดับแถวอยู่)
-- =============================================================

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete
  on all tables in schema public
  to authenticated, service_role;

grant usage, select on all sequences in schema public to authenticated, service_role;

-- ให้ตารางที่สร้างใหม่ในอนาคตได้สิทธิ์อัตโนมัติ
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated, service_role;

alter default privileges in schema public
  grant usage, select on sequences to authenticated, service_role;
