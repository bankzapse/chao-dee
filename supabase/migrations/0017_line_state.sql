-- 0017_line_state.sql — เก็บสถานะการสนทนา LINE ของผู้เช่า
-- ใช้รองรับการแจ้งซ่อมแบบ 2 ข้อความ (พิมพ์ "แจ้งซ่อม" แล้วค่อยพิมพ์รายละเอียด)

alter table public.tenants
  add column if not exists line_state text not null default '';
