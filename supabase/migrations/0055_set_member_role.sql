-- 0055_set_member_role.sql
-- ให้เจ้าของเปลี่ยน "ประเภทสิทธิ์" (role_id) ของสมาชิกทีมได้
--
-- ทำไมต้องใช้ SECURITY DEFINER: profiles มี BEFORE UPDATE guard (0053) ที่ pin role_id
-- สำหรับ current_user = authenticated/anon → ถ้าเจ้าของ (authenticated) update role_id ตรงๆ
-- จะโดน pin กลับ ไม่เปลี่ยน. ฟังก์ชันนี้รันเป็น definer (postgres) → guard ไม่ pin → เปลี่ยนได้จริง
-- แต่ยังตรวจสิทธิ์ผู้เรียกด้วย current_member_role()/current_org_id() (ต้องเป็นเจ้าของ org เดียวกัน)
--
-- ROLLBACK: drop function if exists public.set_member_role(uuid, uuid);

create or replace function public.set_member_role(target_id uuid, new_role_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- เฉพาะเจ้าของกิจการ
  if public.current_member_role() <> 'owner' then
    raise exception 'forbidden: owner only';
  end if;

  -- ถ้าระบุ role ต้องเป็น role ของกิจการเดียวกัน (กันมอบ role ข้าม org)
  if new_role_id is not null and not exists (
    select 1 from public.roles where id = new_role_id and org_id = public.current_org_id()
  ) then
    raise exception 'invalid role for this org';
  end if;

  -- เปลี่ยนได้เฉพาะสมาชิก staff ใน org เดียวกัน (ไม่ยุ่ง owner/admin)
  update public.profiles
     set role_id = new_role_id
   where id = target_id
     and org_id = public.current_org_id()
     and role = 'staff';
end;
$$;

revoke all on function public.set_member_role(uuid, uuid) from public, anon;
grant execute on function public.set_member_role(uuid, uuid) to authenticated;
