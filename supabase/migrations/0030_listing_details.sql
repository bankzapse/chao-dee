-- 0030_listing_details.sql
-- ข้อมูลประกาศแบบละเอียด (สไตล์ renthub): ค่าใช้จ่ายย่อย, ขนาดห้อง, กฎ/ผู้เช่า, สถานที่ใกล้เคียง
alter table public.property_listings
  add column if not exists deposit          numeric not null default 0,   -- เงินประกัน
  add column if not exists advance_payment  numeric not null default 0,   -- จ่ายล่วงหน้า
  add column if not exists water_rate        numeric not null default 0,   -- ค่าน้ำ
  add column if not exists water_mode        text    not null default 'unit',   -- unit=บาท/หน่วย · person=บาท/คน/เดือน
  add column if not exists electric_rate     numeric not null default 0,   -- ค่าไฟ บาท/หน่วย
  add column if not exists common_fee        numeric not null default 0,   -- ค่าส่วนกลาง/เดือน
  add column if not exists internet_fee      numeric not null default 0,   -- ค่าอินเทอร์เน็ต/เดือน
  add column if not exists size_sqm          numeric not null default 0,   -- ขนาดห้อง ตร.ม.
  add column if not exists tenant_gender     text    not null default 'any',   -- any | male | female
  add column if not exists pets_allowed      boolean not null default false,   -- เลี้ยงสัตว์ได้
  add column if not exists nearby            text    not null default '';       -- สถานที่ใกล้เคียง
