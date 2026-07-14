-- 0041_admin_list_members.sql
-- RPC สำหรับหน้า Console → สมาชิก: join org+sub+owner+จำนวนผู้เช่า + ค้นหา/กรอง/แบ่งหน้าใน DB
-- (เดิมโหลดทุก org/sub/owner/tenant มานับใน JS → ไม่ scale)
create or replace function public.admin_list_members(
  p_q text,
  p_status text,
  p_limit int,
  p_offset int
)
returns table(
  org_id uuid,
  org_name text,
  created_at timestamptz,
  owner_name text,
  owner_phone text,
  package_slug text,
  status text,
  expires_at timestamptz,
  tenant_count bigint,
  total_count bigint
)
language sql
security definer
set search_path = public
as $$
  -- cast ::text ทุกคอลัมน์ที่ประกาศ text (กัน enum/varchar ไม่ตรงกับ return type)
  select
    o.id,
    o.name::text,
    o.created_at,
    p.full_name::text,
    p.phone::text,
    s.package_slug::text,
    coalesce(s.status::text, 'expired') as status,
    s.expires_at,
    (select count(*) from public.tenants t where t.org_id = o.id) as tenant_count,
    count(*) over() as total_count
  from public.organizations o
  left join public.profiles p on p.org_id = o.id and p.role = 'owner'
  left join public.subscriptions s on s.org_id = o.id
  where (
      p_q is null or p_q = ''
      or o.name ilike '%' || p_q || '%'
      or coalesce(p.full_name, '') ilike '%' || p_q || '%'
      or coalesce(p.phone, '') ilike '%' || p_q || '%'
    )
    and (p_status is null or p_status = '' or coalesce(s.status, 'expired') = p_status)
  order by o.created_at desc
  limit greatest(1, p_limit) offset greatest(0, p_offset);
$$;
grant execute on function public.admin_list_members(text, text, int, int) to service_role;
