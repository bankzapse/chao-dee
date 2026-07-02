-- =============================================================
-- ChaoDee — เปลี่ยน auth เป็นเบอร์โทร + SMS OTP
-- เพิ่ม phone ใน profiles + อัปเดต trigger ให้รองรับสมัครด้วยเบอร์
-- =============================================================

alter table public.profiles
  add column if not exists phone text not null default '';

create index if not exists profiles_phone_idx on public.profiles(phone);

-- อัปเดต trigger สร้าง org + profile ตอนสมัคร (รองรับทั้ง email และ phone)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
begin
  insert into public.organizations (name)
  values (coalesce(nullif(new.raw_user_meta_data->>'org_name', ''), 'หอพักของฉัน'))
  returning id into new_org_id;

  insert into public.profiles (id, org_id, full_name, phone, role)
  values (
    new.id,
    new_org_id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.phone, ''),
    'owner'
  );

  return new;
end;
$$;
