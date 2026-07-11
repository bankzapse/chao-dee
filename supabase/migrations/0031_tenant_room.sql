-- 0031_tenant_room.sql
-- ผูกห้องกับผู้เช่าโดยตรง (ระบุเลขห้องเช่าได้เลย ไม่ต้องผ่านสัญญา)
-- ใช้แสดงเลขห้องในหน้าผู้เช่า/แจ้งซ่อม และจับคู่ผู้เช่าตอนรับพัสดุ
alter table public.tenants
  add column if not exists room_id uuid references public.rooms(id) on delete set null;
create index if not exists tenants_room_idx on public.tenants(room_id);
