-- 0028_account_type.sql
-- แยกประเภทบัญชีจริง: 'chaodee' (ใช้ระบบจัดการหอ) vs 'rent' (ลงประกาศเช่าอย่างเดียว)
-- บัญชี rent: ไม่ได้ trial subscription + ถูกกันออกจากแอปจัดการหอ (บังคับใน layout)

alter table public.organizations
  add column if not exists account_type text not null default 'chaodee';

-- provision หลังยืนยัน OTP — อ่าน signup_source จาก metadata
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
  inv public.invitations;
  v_source text := coalesce(nullif(new.raw_user_meta_data->>'signup_source', ''), 'chaodee');
begin
  if new.phone_confirmed_at is null then
    return new;
  end if;
  if exists (select 1 from public.profiles where id = new.id) then
    return new;
  end if;

  -- ผู้ถูกเชิญเข้าทีม (ยึด org เดิม — ไม่เกี่ยวกับ rent)
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

  -- กิจการใหม่ (ระบุ account_type ตามที่มา)
  insert into public.organizations (name, building_type, room_count, province, district, subdistrict, status, signup_promo, account_type)
  values (
    coalesce(nullif(new.raw_user_meta_data->>'org_name', ''), 'หอพักของฉัน'),
    coalesce(nullif(new.raw_user_meta_data->>'building_type', ''), 'dorm'),
    coalesce(new.raw_user_meta_data->>'room_count', ''),
    coalesce(new.raw_user_meta_data->>'province', ''),
    coalesce(new.raw_user_meta_data->>'district', ''),
    coalesce(new.raw_user_meta_data->>'subdistrict', ''),
    coalesce(new.raw_user_meta_data->>'prop_status', ''),
    coalesce(new.raw_user_meta_data->>'promo', ''),
    case when v_source = 'rent' then 'rent' else 'chaodee' end
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

  -- เฉพาะบัญชี Chao-Dee เท่านั้นที่ได้ทดลองใช้ระบบจัดการหอ 30 วัน
  if v_source <> 'rent' then
    insert into public.subscriptions (org_id, package_slug, cycle, status, expires_at)
    values (new_org_id, 'pro', 'monthly', 'trialing', now() + interval '30 days');
  end if;

  return new;
end;
$$;
