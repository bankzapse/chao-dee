-- 0016_normalize_tenant_phone.sql — ทำเบอร์ผู้เช่าเป็นตัวเลขล้วน (0xxxxxxxxx)
-- เพื่อให้ผูก LINE ด้วยเบอร์โทรจับคู่ได้แม่นยำ

update public.tenants
set phone = case
  when left(regexp_replace(phone, '\D', '', 'g'), 2) = '66'
    then '0' || substring(regexp_replace(phone, '\D', '', 'g') from 3)
  else regexp_replace(phone, '\D', '', 'g')
end
where phone <> '';
