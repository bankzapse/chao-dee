-- 0054_announcement_building.sql
-- ประกาศ LINE แยกตามอาคาร: ส่งเฉพาะผู้เช่าในอาคารที่เลือก
-- building_id = NULL → ส่งทุกอาคารในกิจการ (พฤติกรรมเดิม)
--
-- ROLLBACK: alter table public.announcements drop column if exists building_id;

alter table public.announcements
  add column if not exists building_id uuid references public.buildings(id) on delete cascade;

create index if not exists announcements_building_idx on public.announcements(building_id);
