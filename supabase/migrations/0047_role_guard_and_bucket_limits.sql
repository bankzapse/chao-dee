-- 0047_role_guard_and_bucket_limits.sql
--
-- 1) กันทีมงานระดับ staff แก้ "ช่องทางรับเงิน" ของหอ
--    เดิม policy org_update ให้ทุกคนใน org แก้ตาราง organizations ได้
--    staff จึงเปลี่ยนเลขบัญชี/พร้อมเพย์/รูป QR เป็นของตัวเองได้ → ค่าเช่าเข้าบัญชีเขา
--    ต้องแก้ที่ RLS ไม่ใช่แค่ในโค้ด เพราะ anon key เป็นค่าสาธารณะ (NEXT_PUBLIC)
--    staff เรียก REST ของ Supabase ตรงๆ ด้วย token ตัวเองก็ข้าม server action ได้
--
-- 2) จำกัดขนาด/ชนิดไฟล์ของ bucket รูปภาพ
--    เดิมจำกัดแค่ฝั่ง browser ซึ่งข้ามได้ตรงๆ

-- ---------- helper: role ของผู้ใช้ปัจจุบัน ----------
-- ตั้งค่าเหมือน current_org_id() ทุกอย่าง (security definer + ไม่แตะ grant)
-- ถ้าไป revoke จาก public แล้ว policy ถูกประเมินในบริบท anon จะพังทั้งหน้า
create or replace function public.current_member_role()
returns member_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ---------- organizations: staff แก้ไม่ได้ ----------
drop policy if exists "org_update" on public.organizations;
create policy "org_update" on public.organizations
  for update
  using (
    id = public.current_org_id()
    and public.current_member_role() in ('owner', 'admin')
  )
  with check (
    id = public.current_org_id()
    and public.current_member_role() in ('owner', 'admin')
  );

-- ---------- ลบข้อมูลสำคัญ: staff ทำไม่ได้ ----------
-- staff ยังเพิ่ม/แก้ข้อมูลประจำวันได้ตามปกติ (จดมิเตอร์ ออกบิล รับชำระ)
-- แต่การลบทิ้งถาวรสงวนให้ owner/admin
do $$
declare
  t text;
begin
  foreach t in array array[
    'buildings', 'rooms', 'tenants', 'contracts',
    'invoices', 'payments', 'building_expenses'
  ]
  loop
    execute format(
      'drop policy if exists %I on public.%I',
      t || '_delete_manager', t
    );
    execute format(
      'create policy %I on public.%I for delete using (%s and public.current_member_role() in (''owner'', ''admin''))',
      t || '_delete_manager',
      t,
      case
        -- rooms ไม่มีคอลัมน์ org_id — ผูก org ผ่าน buildings
        when t = 'rooms' then
          'exists (select 1 from public.buildings b where b.id = rooms.building_id and b.org_id = public.current_org_id())'
        else 'org_id = public.current_org_id()'
      end
    );
  end loop;
end $$;

-- policy "<table>_all" เดิมยังอยู่และครอบ delete ด้วย
-- Postgres รวม policy หลายอันด้วย OR → policy ใหม่จะไม่มีผลถ้าไม่ตัด delete ออกจากตัวเดิม
-- จึงต้องแยก policy เดิมเป็น select/insert/update (ไม่รวม delete)
do $$
declare
  t text;
  cond text;
begin
  foreach t in array array[
    'buildings', 'rooms', 'tenants', 'contracts',
    'invoices', 'payments', 'building_expenses'
  ]
  loop
    cond := case
      when t = 'rooms' then
        'exists (select 1 from public.buildings b where b.id = rooms.building_id and b.org_id = public.current_org_id())'
      else 'org_id = public.current_org_id()'
    end;

    execute format('drop policy if exists %I on public.%I', t || '_all', t);

    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format('create policy %I on public.%I for select using (%s)', t || '_select', t, cond);

    execute format('drop policy if exists %I on public.%I', t || '_insert', t);
    execute format('create policy %I on public.%I for insert with check (%s)', t || '_insert', t, cond);

    execute format('drop policy if exists %I on public.%I', t || '_update', t);
    execute format('create policy %I on public.%I for update using (%s) with check (%s)', t || '_update', t, cond, cond);
  end loop;
end $$;

-- invoice_items ผูก org ผ่าน invoices — แยก policy เหมือนกัน
drop policy if exists "invoice_items_all" on public.invoice_items;

drop policy if exists "invoice_items_select" on public.invoice_items;
create policy "invoice_items_select" on public.invoice_items for select
  using (exists (
    select 1 from public.invoices i
    where i.id = invoice_items.invoice_id and i.org_id = public.current_org_id()
  ));

drop policy if exists "invoice_items_insert" on public.invoice_items;
create policy "invoice_items_insert" on public.invoice_items for insert
  with check (exists (
    select 1 from public.invoices i
    where i.id = invoice_items.invoice_id and i.org_id = public.current_org_id()
  ));

drop policy if exists "invoice_items_update" on public.invoice_items;
create policy "invoice_items_update" on public.invoice_items for update
  using (exists (
    select 1 from public.invoices i
    where i.id = invoice_items.invoice_id and i.org_id = public.current_org_id()
  ));

-- รายการย่อยในบิลลบได้ทุก role (เป็นการแก้บิลตามปกติ ไม่ใช่การลบข้อมูลถาวร)
drop policy if exists "invoice_items_delete" on public.invoice_items;
create policy "invoice_items_delete" on public.invoice_items for delete
  using (exists (
    select 1 from public.invoices i
    where i.id = invoice_items.invoice_id and i.org_id = public.current_org_id()
  ));

-- ---------- จำกัดขนาด/ชนิดไฟล์ของ bucket รูปภาพ ----------
update storage.buckets
  set file_size_limit = 3145728,  -- 3 MB
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
  where id = 'payment-qr';

update storage.buckets
  set file_size_limit = 8388608,  -- 8 MB (รูปประกาศห้องเช่า ใหญ่กว่าได้)
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
  where id = 'listings';

-- ---------- index ที่ขาด (query ที่วิ่งบ่อยที่สุดกลับไม่มี index) ----------
-- LINE webhook ใช้ service-role → RLS ไม่ช่วยจำกัดแถว จึงสแกนทั้งตารางของทั้งแพลตฟอร์ม
-- ทุกครั้งที่ผู้เช่าพิมพ์ข้อความเข้ามา
create index if not exists invoices_tenant_idx
  on public.invoices(tenant_id);

create index if not exists org_owner_line_idx
  on public.organizations(owner_line_user_id)
  where owner_line_user_id <> '';

create index if not exists tenants_phone_idx
  on public.tenants(phone)
  where phone <> '';

create index if not exists parcels_tenant_status_idx
  on public.parcels(tenant_id, status);

-- tenant_documents (0020) ไม่มี index เลยนอกจาก PK
create index if not exists tenant_documents_tenant_idx
  on public.tenant_documents(tenant_id);

-- ออกบิล/คำนวณใหม่ กรองสัญญาด้วย status ทุกครั้ง
create index if not exists contracts_org_status_idx
  on public.contracts(org_id, status);
