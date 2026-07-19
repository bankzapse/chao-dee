-- 0043_garbage_fee.sql
-- ค่าขยะรายห้อง — เลือกได้ 2 โหมด
--   per_room = ระบุจำนวนเงินรายห้อง (แต่ละห้องต่างกันได้)
--   flat     = เหมาราคาเดียว ใช้กับทุกห้อง

-- โหมด + ราคาเหมา (ระดับกิจการ)
alter table public.organizations
  add column if not exists garbage_mode text not null default 'per_room',
  add column if not exists garbage_flat numeric(10,2) not null default 0;

-- ค่าขยะรายห้อง (ใช้เมื่อโหมด per_room)
alter table public.rooms
  add column if not exists garbage_fee numeric(10,2) not null default 0;

-- ยอดค่าขยะในบิล
alter table public.invoices
  add column if not exists garbage_amount numeric(12,2) not null default 0;
