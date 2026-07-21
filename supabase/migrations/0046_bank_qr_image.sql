-- 0046_bank_qr_image.sql
-- อัปโหลดรูป QR ของบัญชีธนาคารเองได้ (ไม่บังคับ)
--
-- ทำไมต้องอัปโหลดรูป: เลขบัญชีธนาคารเปล่าๆ แปลงเป็นคิวอาร์มาตรฐาน Thai QR ไม่ได้
-- (มาตรฐานรับได้แค่ พร้อมเพย์ = เบอร์มือถือ / เลขบัตร ปชช. / เลขผู้เสียภาษี / e-Wallet)
-- แต่แอปธนาคารหลายเจ้าสร้างรูป QR รับเงินของบัญชีนั้นให้เองได้
-- จึงเปิดให้เจ้าของหอบันทึกรูปนั้นมาอัปโหลดแทน

-- เก็บเป็น public URL (bucket public) เพราะต้องแสดงในบิลผู้เช่าที่เปิดโดยไม่ต้องล็อกอิน
alter table public.organizations
  add column if not exists bank_qr_url text not null default '';

alter table public.platform_settings
  add column if not exists bank_qr_url text not null default '';

-- ---------- bucket สำหรับรูป QR รับเงิน ----------
-- public read: รูปนี้มีไว้ให้ผู้เช่าสแกนอยู่แล้ว และหน้าบิลเปิดได้โดยไม่ต้องล็อกอิน
insert into storage.buckets (id, name, public)
values ('payment-qr', 'payment-qr', true)
on conflict (id) do nothing;

drop policy if exists "payment_qr_read" on storage.objects;
create policy "payment_qr_read" on storage.objects
  for select using (bucket_id = 'payment-qr');

-- อัปโหลดได้เฉพาะผู้ใช้ที่ล็อกอิน (ชื่อไฟล์เป็น uuid สุ่ม ไม่ทับกันข้ามหอ)
-- ไม่มี update/delete สำหรับ authenticated → ลบ/เขียนทับรูปของหออื่นไม่ได้
drop policy if exists "payment_qr_insert" on storage.objects;
create policy "payment_qr_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'payment-qr');
