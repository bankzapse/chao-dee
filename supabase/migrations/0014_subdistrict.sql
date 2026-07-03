-- 0014_subdistrict.sql — เพิ่มตำบล (subdistrict) ในข้อมูลกิจการ

alter table public.organizations
  add column if not exists subdistrict text not null default '';

-- เพิ่ม subdistrict เข้า trigger สมัครสมาชิก
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
