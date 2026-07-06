-- 0019_provision_after_otp.sql
-- แก้ปัญหา: เดิม trigger สร้าง org/profile/subscription ทันทีตอน signUp (auth.users INSERT)
-- ทำให้ "ระบบถูกสร้าง" ก่อนยืนยัน OTP — ถ้า SMS ไม่เข้า ก็ได้บัญชีค้างและสมัครซ้ำไม่ได้
--
-- ใหม่: provision เฉพาะเมื่อ "ยืนยันเบอร์แล้ว" (phone_confirmed_at not null) และยังไม่มี profile
--       จึงยิง trigger ทั้ง INSERT และ UPDATE เพื่อจับจังหวะที่ verifyOtp เซ็ต phone_confirmed_at
-- หมายเหตุ: ไม่มีการลบข้อมูลเดิม — บัญชีที่ยืนยันแล้วมี profile อยู่แล้วจะถูกข้าม (กันซ้ำ)

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
  inv public.invitations;
begin
  -- ยังไม่ยืนยันเบอร์ → ยังไม่สร้างระบบ
  if new.phone_confirmed_at is null then
    return new;
  end if;

  -- provision ไปแล้ว (มี profile) → ข้าม กันสร้างซ้ำเมื่อมี UPDATE อื่น ๆ ตามมา
  if exists (select 1 from public.profiles where id = new.id) then
    return new;
  end if;

  -- ผู้ถูกเชิญเข้าทีม
  select * into inv from public.invitations
   where phone = new.phone and status = 'pending'
   order by created_at desc limit 1;

  if inv.id is not null then
    insert into public.profiles (id, org_id, full_name, phone, email, role)
    values (
      new.id, inv.org_id,
      coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), inv.full_name),
      coalesce(new.phone, ''),
      coalesce(new.raw_user_meta_data->>'email', ''),
      inv.role::member_role
    );
    update public.invitations set status = 'accepted', accepted_at = now() where id = inv.id;
    return new;
  end if;

  -- เจ้าของหอใหม่
  insert into public.organizations (name, building_type, room_count, province, district, subdistrict, status, signup_promo)
  values (
    coalesce(nullif(new.raw_user_meta_data->>'org_name', ''), 'หอพักของฉัน'),
    coalesce(nullif(new.raw_user_meta_data->>'building_type', ''), 'dorm'),
    coalesce(new.raw_user_meta_data->>'room_count', ''),
    coalesce(new.raw_user_meta_data->>'province', ''),
    coalesce(new.raw_user_meta_data->>'district', ''),
    coalesce(new.raw_user_meta_data->>'subdistrict', ''),
    coalesce(new.raw_user_meta_data->>'prop_status', ''),
    coalesce(new.raw_user_meta_data->>'promo', '')
  )
  returning id into new_org_id;

  insert into public.profiles (id, org_id, full_name, phone, email, role)
  values (
    new.id, new_org_id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.phone, ''),
    coalesce(new.raw_user_meta_data->>'email', ''),
    'owner'
  );

  insert into public.subscriptions (org_id, package_slug, cycle, status, expires_at)
  values (new_org_id, 'pro', 'monthly', 'trialing', now() + interval '30 days');

  return new;
end;
$$;

-- ยิง trigger ทั้งตอน INSERT (เผื่อระบบตั้ง auto-confirm) และ UPDATE (ตอน verifyOtp เซ็ต phone_confirmed_at)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update on auth.users
  for each row execute function public.handle_new_user();

-- helper: หา user id ที่ "ยังไม่ยืนยันเบอร์" ตามเบอร์ (ให้ฝั่งแอปเช็คเพื่อส่ง OTP ซ้ำได้ตอนสมัครใหม่)
-- คืน null ถ้าไม่พบ หรือบัญชียืนยันแล้ว (ควรให้ไปเข้าสู่ระบบแทน)
create or replace function public.unconfirmed_user_id_by_phone(p_phone text)
returns uuid
language sql
security definer
set search_path = public, auth
as $$
  select id from auth.users
   where phone = regexp_replace(p_phone, '\D', '', 'g')
     and phone_confirmed_at is null
   order by created_at desc
   limit 1;
$$;

revoke all on function public.unconfirmed_user_id_by_phone(text) from public, anon, authenticated;
grant execute on function public.unconfirmed_user_id_by_phone(text) to service_role;
