-- 0021_building_floors.sql — รองรับอาคารหลายชั้น
-- เพิ่มจำนวนชั้นของอาคาร เพื่อให้เลือกชั้นตอนเพิ่มห้องได้ชัดเจน (non-destructive)

alter table public.buildings
  add column if not exists floors int not null default 1;

-- อย่างน้อย 1 ชั้นเสมอ
update public.buildings set floors = 1 where floors < 1;
