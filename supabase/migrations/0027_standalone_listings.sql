-- 0027_standalone_listings.sql
-- ประกาศแบบ standalone (ผู้ลงประกาศที่ไม่ได้ใช้ระบบจัดการหอ — ไม่มีอาคาร/ห้องในระบบ)
-- ใช้ค่ากรอกเองเมื่อ building_id เป็น null; ถ้ามี building_id ยังดึงห้องว่าง/ราคาจาก rooms เหมือนเดิม
alter table public.property_listings
  add column if not exists price_min    numeric not null default 0,
  add column if not exists price_max    numeric not null default 0,
  add column if not exists total_rooms  int not null default 0,
  add column if not exists vacant_rooms int not null default 0;
