-- 0039_storage_rls_org_scope.sql
-- ปิดช่องโหว่ร้ายแรง: เดิม bucket documents/slips/listings ให้ผู้ใช้ที่ล็อกอิน "คนใดก็ได้"
-- อ่าน/ลบไฟล์ข้ามหอได้ทั้งหมด (สำเนาบัตร ปชช. / สัญญา / สลิปโอนเงิน)
-- แก้ให้ผูกกับ org ของผู้ใช้ (current_org_id) โดยไม่ต้องย้ายไฟล์เดิม (path คงเดิม)

-- ============================================================
-- documents (สำเนาบัตร/สัญญา) — path: tenants/{tenant_id}/... หรือ contracts/{contract_id}/...
-- ============================================================
drop policy if exists "documents_storage_all" on storage.objects;

-- helper แบบ inline: object นี้อยู่ในหอของผู้ใช้ไหม
-- tenants/{id}  → id ต้องเป็น tenant ของ org ผู้ใช้
-- contracts/{id} → id ต้องเป็น contract ของ org ผู้ใช้
create policy "documents_read" on storage.objects for select to authenticated
using (
  bucket_id = 'documents' and (
    ((storage.foldername(name))[1] = 'tenants' and exists (
      select 1 from public.tenants t
      where t.id::text = (storage.foldername(name))[2] and t.org_id = public.current_org_id()))
    or
    ((storage.foldername(name))[1] = 'contracts' and exists (
      select 1 from public.contracts c
      where c.id::text = (storage.foldername(name))[2] and c.org_id = public.current_org_id()))
  )
);

create policy "documents_insert" on storage.objects for insert to authenticated
with check (
  bucket_id = 'documents' and (
    ((storage.foldername(name))[1] = 'tenants' and exists (
      select 1 from public.tenants t
      where t.id::text = (storage.foldername(name))[2] and t.org_id = public.current_org_id()))
    or
    ((storage.foldername(name))[1] = 'contracts' and exists (
      select 1 from public.contracts c
      where c.id::text = (storage.foldername(name))[2] and c.org_id = public.current_org_id()))
  )
);

create policy "documents_delete" on storage.objects for delete to authenticated
using (
  bucket_id = 'documents' and (
    ((storage.foldername(name))[1] = 'tenants' and exists (
      select 1 from public.tenants t
      where t.id::text = (storage.foldername(name))[2] and t.org_id = public.current_org_id()))
    or
    ((storage.foldername(name))[1] = 'contracts' and exists (
      select 1 from public.contracts c
      where c.id::text = (storage.foldername(name))[2] and c.org_id = public.current_org_id()))
  )
);

-- ============================================================
-- slips (สลิปโอนเงิน — sensitive)
-- อ่าน/ลบ ทำผ่าน server (service role) เท่านั้น; client ได้แค่ "อัปโหลด" ตอนแจ้งชำระ
-- ============================================================
drop policy if exists "slips_storage_all" on storage.objects;

create policy "slips_insert" on storage.objects for insert to authenticated
with check (bucket_id = 'slips');
-- ไม่มี policy select/update/delete สำหรับ authenticated → client อ่าน/ลบสลิปข้ามหอไม่ได้อีก
-- (owner console อ่านผ่าน service role ซึ่ง bypass RLS)

-- ============================================================
-- listings (รูปประกาศ — public read คงไว้)
-- เดิม write เปิดให้ทุกคนที่ล็อกอิน → เขียนทับ/ลบรูปหออื่นได้
-- ============================================================
drop policy if exists "listings_storage_write" on storage.objects;
-- คง listings_storage_read (public select) ไว้ตามเดิม

create policy "listings_insert" on storage.objects for insert to authenticated
with check (bucket_id = 'listings');
-- ไม่มี update/delete สำหรับ authenticated → เขียนทับ/ลบรูปประกาศหออื่นไม่ได้
