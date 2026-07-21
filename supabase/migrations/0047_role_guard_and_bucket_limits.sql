-- 0047_role_guard_and_bucket_limits.sql
--
-- แบ่งเป็น 5 ส่วน รันทีละส่วนได้ ถ้าส่วนไหน error จะรู้ทันทีว่าพังตรงไหน
-- (เขียนเป็น SQL ตรงๆ ไม่ใช้ DO block / dynamic SQL เพื่อให้ error ชี้จุดได้ชัด)
--
-- ปัญหาที่แก้:
-- 1) policy org_update เดิมให้ "ทุกคนใน org" แก้ organizations ได้
--    staff จึงเปลี่ยนเลขบัญชี/พร้อมเพย์/รูป QR เป็นของตัวเองได้ = ค่าเช่าเข้าบัญชีเขา
--    ต้องแก้ที่ RLS เพราะ anon key เป็นค่าสาธารณะ (NEXT_PUBLIC) staff ยิง REST
--    ตรงเข้า Supabase ด้วย token ตัวเองก็ข้าม server action ได้
-- 2) policy "<table>_all" ครอบ delete ด้วย และ Postgres รวม policy หลายอันด้วย OR
--    ถ้าไม่ตัด _all ทิ้ง policy ใหม่ที่เข้มกว่าจะไม่มีผลเลย
-- 3) bucket รูปภาพไม่จำกัดขนาด/ชนิดไฟล์ (จำกัดแค่ฝั่ง browser ซึ่งข้ามได้)
-- 4) query ที่วิ่งบ่อยที่สุด (LINE webhook) ไม่มี index


-- ══════════════════════════════════════════════════════════
-- ส่วนที่ 1: helper อ่าน role ของผู้ใช้ปัจจุบัน
-- ══════════════════════════════════════════════════════════
-- ตั้งค่าเหมือน current_org_id() ทุกอย่าง และไม่แตะ grant
-- (ถ้า revoke จาก public แล้ว policy ถูกประเมินในบริบท anon จะพังทั้งหน้า)

create or replace function public.current_member_role()
returns member_role
language sql
stable
security definer
set search_path = public
as $fn$
  select role from public.profiles where id = auth.uid();
$fn$;


-- ══════════════════════════════════════════════════════════
-- ส่วนที่ 2: organizations — staff แก้ไม่ได้
-- ══════════════════════════════════════════════════════════

drop policy if exists "org_update" on public.organizations;
create policy "org_update" on public.organizations
  for update
  using (id = public.current_org_id() and public.current_member_role() in ('owner', 'admin'))
  with check (id = public.current_org_id() and public.current_member_role() in ('owner', 'admin'));


-- ══════════════════════════════════════════════════════════
-- ส่วนที่ 3: แยก policy _all เป็น select/insert/update
--            แล้วให้ delete เฉพาะ owner/admin
-- ══════════════════════════════════════════════════════════
-- staff ยังเพิ่ม/แก้ข้อมูลประจำวันได้ตามปกติ (จดมิเตอร์ ออกบิล รับชำระ)
-- แต่การลบทิ้งถาวรสงวนให้ owner/admin

-- ---------- buildings ----------
drop policy if exists "buildings_all" on public.buildings;

drop policy if exists "buildings_select" on public.buildings;
create policy "buildings_select" on public.buildings
  for select using (org_id = public.current_org_id());

drop policy if exists "buildings_insert" on public.buildings;
create policy "buildings_insert" on public.buildings
  for insert with check (org_id = public.current_org_id());

drop policy if exists "buildings_update" on public.buildings;
create policy "buildings_update" on public.buildings
  for update using (org_id = public.current_org_id()) with check (org_id = public.current_org_id());

drop policy if exists "buildings_delete" on public.buildings;
create policy "buildings_delete" on public.buildings
  for delete using (org_id = public.current_org_id() and public.current_member_role() in ('owner', 'admin'));

-- ---------- tenants ----------
drop policy if exists "tenants_all" on public.tenants;

drop policy if exists "tenants_select" on public.tenants;
create policy "tenants_select" on public.tenants
  for select using (org_id = public.current_org_id());

drop policy if exists "tenants_insert" on public.tenants;
create policy "tenants_insert" on public.tenants
  for insert with check (org_id = public.current_org_id());

drop policy if exists "tenants_update" on public.tenants;
create policy "tenants_update" on public.tenants
  for update using (org_id = public.current_org_id()) with check (org_id = public.current_org_id());

drop policy if exists "tenants_delete" on public.tenants;
create policy "tenants_delete" on public.tenants
  for delete using (org_id = public.current_org_id() and public.current_member_role() in ('owner', 'admin'));

-- ---------- contracts ----------
drop policy if exists "contracts_all" on public.contracts;

drop policy if exists "contracts_select" on public.contracts;
create policy "contracts_select" on public.contracts
  for select using (org_id = public.current_org_id());

drop policy if exists "contracts_insert" on public.contracts;
create policy "contracts_insert" on public.contracts
  for insert with check (org_id = public.current_org_id());

drop policy if exists "contracts_update" on public.contracts;
create policy "contracts_update" on public.contracts
  for update using (org_id = public.current_org_id()) with check (org_id = public.current_org_id());

drop policy if exists "contracts_delete" on public.contracts;
create policy "contracts_delete" on public.contracts
  for delete using (org_id = public.current_org_id() and public.current_member_role() in ('owner', 'admin'));

-- ---------- building_expenses ----------
drop policy if exists "building_expenses_all" on public.building_expenses;

drop policy if exists "building_expenses_select" on public.building_expenses;
create policy "building_expenses_select" on public.building_expenses
  for select using (org_id = public.current_org_id());

drop policy if exists "building_expenses_insert" on public.building_expenses;
create policy "building_expenses_insert" on public.building_expenses
  for insert with check (org_id = public.current_org_id());

drop policy if exists "building_expenses_update" on public.building_expenses;
create policy "building_expenses_update" on public.building_expenses
  for update using (org_id = public.current_org_id()) with check (org_id = public.current_org_id());

drop policy if exists "building_expenses_delete" on public.building_expenses;
create policy "building_expenses_delete" on public.building_expenses
  for delete using (org_id = public.current_org_id() and public.current_member_role() in ('owner', 'admin'));

-- ---------- invoices ----------
drop policy if exists "invoices_all" on public.invoices;

drop policy if exists "invoices_select" on public.invoices;
create policy "invoices_select" on public.invoices
  for select using (org_id = public.current_org_id());

drop policy if exists "invoices_insert" on public.invoices;
create policy "invoices_insert" on public.invoices
  for insert with check (org_id = public.current_org_id());

drop policy if exists "invoices_update" on public.invoices;
create policy "invoices_update" on public.invoices
  for update using (org_id = public.current_org_id()) with check (org_id = public.current_org_id());

drop policy if exists "invoices_delete" on public.invoices;
create policy "invoices_delete" on public.invoices
  for delete using (org_id = public.current_org_id() and public.current_member_role() in ('owner', 'admin'));

-- ---------- payments ----------
drop policy if exists "payments_all" on public.payments;

drop policy if exists "payments_select" on public.payments;
create policy "payments_select" on public.payments
  for select using (org_id = public.current_org_id());

drop policy if exists "payments_insert" on public.payments;
create policy "payments_insert" on public.payments
  for insert with check (org_id = public.current_org_id());

drop policy if exists "payments_update" on public.payments;
create policy "payments_update" on public.payments
  for update using (org_id = public.current_org_id()) with check (org_id = public.current_org_id());

drop policy if exists "payments_delete" on public.payments;
create policy "payments_delete" on public.payments
  for delete using (org_id = public.current_org_id() and public.current_member_role() in ('owner', 'admin'));

-- ---------- rooms ----------
drop policy if exists "rooms_all" on public.rooms;

drop policy if exists "rooms_select" on public.rooms;
create policy "rooms_select" on public.rooms
  for select using (exists (select 1 from public.buildings b where b.id = rooms.building_id and b.org_id = public.current_org_id()));

drop policy if exists "rooms_insert" on public.rooms;
create policy "rooms_insert" on public.rooms
  for insert with check (exists (select 1 from public.buildings b where b.id = rooms.building_id and b.org_id = public.current_org_id()));

drop policy if exists "rooms_update" on public.rooms;
create policy "rooms_update" on public.rooms
  for update using (exists (select 1 from public.buildings b where b.id = rooms.building_id and b.org_id = public.current_org_id())) with check (exists (select 1 from public.buildings b where b.id = rooms.building_id and b.org_id = public.current_org_id()));

drop policy if exists "rooms_delete" on public.rooms;
create policy "rooms_delete" on public.rooms
  for delete using (exists (select 1 from public.buildings b where b.id = rooms.building_id and b.org_id = public.current_org_id()) and public.current_member_role() in ('owner', 'admin'));

-- ---------- invoice_items (ผูก org ผ่าน invoices) ----------
-- ลบรายการย่อยในบิลได้ทุก role — เป็นการแก้บิลตามปกติ ไม่ใช่ลบข้อมูลถาวร
drop policy if exists "invoice_items_all" on public.invoice_items;

drop policy if exists "invoice_items_select" on public.invoice_items;
create policy "invoice_items_select" on public.invoice_items
  for select using (exists (select 1 from public.invoices i where i.id = invoice_items.invoice_id and i.org_id = public.current_org_id()));

drop policy if exists "invoice_items_insert" on public.invoice_items;
create policy "invoice_items_insert" on public.invoice_items
  for insert with check (exists (select 1 from public.invoices i where i.id = invoice_items.invoice_id and i.org_id = public.current_org_id()));

drop policy if exists "invoice_items_update" on public.invoice_items;
create policy "invoice_items_update" on public.invoice_items
  for update using (exists (select 1 from public.invoices i where i.id = invoice_items.invoice_id and i.org_id = public.current_org_id())) with check (exists (select 1 from public.invoices i where i.id = invoice_items.invoice_id and i.org_id = public.current_org_id()));

drop policy if exists "invoice_items_delete" on public.invoice_items;
create policy "invoice_items_delete" on public.invoice_items
  for delete using (exists (select 1 from public.invoices i where i.id = invoice_items.invoice_id and i.org_id = public.current_org_id()));


-- ══════════════════════════════════════════════════════════
-- ส่วนที่ 4: จำกัดขนาด/ชนิดไฟล์ของ bucket รูปภาพ
-- ══════════════════════════════════════════════════════════
-- ถ้าส่วนนี้ error เรื่องสิทธิ์ ข้ามได้ ไปตั้งใน Dashboard → Storage → bucket → Settings แทน

update storage.buckets
  set file_size_limit = 3145728,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
  where id = 'payment-qr';

update storage.buckets
  set file_size_limit = 8388608,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
  where id = 'listings';


-- ══════════════════════════════════════════════════════════
-- ส่วนที่ 5: index ที่ขาด
-- ══════════════════════════════════════════════════════════
-- LINE webhook ใช้ service-role → RLS ไม่ช่วยจำกัดแถว จึงสแกนทั้งตาราง
-- ของทั้งแพลตฟอร์มทุกครั้งที่ผู้เช่าพิมพ์ข้อความเข้ามา

create index if not exists invoices_tenant_idx on public.invoices(tenant_id);
create index if not exists org_owner_line_idx on public.organizations(owner_line_user_id);
create index if not exists tenants_phone_idx on public.tenants(phone);
create index if not exists parcels_tenant_status_idx on public.parcels(tenant_id, status);
create index if not exists tenant_documents_tenant_idx on public.tenant_documents(tenant_id);
create index if not exists contracts_org_status_idx on public.contracts(org_id, status);
