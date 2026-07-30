-- 0048_maintenance_photo.sql
-- แนบรูปตอนแจ้งซ่อม (ผู้เช่าแจ้งผ่าน LINE LIFF ถ่ายรูปปัญหาได้)

alter table public.maintenance_requests
  add column if not exists photo_url text not null default '';

-- ---------- bucket รูปแจ้งซ่อม ----------
-- public read: เจ้าของหอเปิดดูรูปในหน้าจัดการ (ใช้ authed client อ่าน public URL ได้)
-- ผู้เช่าใน LIFF ไม่มี Supabase session — อัปโหลดผ่าน API (service-role) เท่านั้น
-- จึงไม่ต้องมี insert policy สำหรับ authenticated/anon เลย
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'maintenance', 'maintenance', true, 8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "maintenance_photo_read" on storage.objects;
create policy "maintenance_photo_read" on storage.objects
  for select using (bucket_id = 'maintenance');
