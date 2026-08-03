-- 0051_profiles_guard.sql
-- ===========================================================================
-- ปิดช่องยกระดับสิทธิ์ผ่าน profiles (privilege escalation)
--
-- ปัญหา (0002_rls.sql:67-68):
--   policy "profiles_update" = for update using (id = auth.uid())
--   — ไม่มี with check และไม่จำกัดคอลัมน์ · ไม่มี trigger เฝ้า
--   → ผู้ใช้ที่ล็อกอินแล้ว PATCH แถวตัวเองผ่าน PostgREST (anon/authenticated key)
--     เปลี่ยน role → 'owner' หรือย้าย org_id ไปหอคนอื่นได้
--     (current_org_id() อ่านจาก profiles.org_id → ทุก policy org-scoped ตามนั้น)
--
-- แก้ 2 ชั้น:
--   1) BEFORE UPDATE trigger — เมื่อผู้เรียกเป็น authenticated/anon (PostgREST ฝั่งผู้ใช้)
--      ปัก org_id / role / id ให้คงค่าเดิมเงียบ ๆ · ฝั่ง service_role / postgres
--      (admin client เช่นเชิญทีม/เปลี่ยนสิทธิ์ ใน team/actions.ts และ trigger สมัครสมาชิก)
--      ยังแก้ได้ตามปกติ
--   2) เพิ่ม with check ให้ policy profiles_update (กันซ้ำอีกชั้น: NEW.id ต้องเป็นของตัวเอง)
--
-- ปลอดภัยกับเจ้าของหอที่ใช้งานอยู่: การแก้ full_name / phone ของตัวเองยังทำได้
-- ล็อกเฉพาะ org_id / role → เจ้าของยังเป็น owner ของ org เดิมทุกประการ (ไม่หลุดออกจากระบบ)
--
-- ROLLBACK (ถ้าต้องย้อนกลับ):
--   drop trigger if exists profiles_guard_privileged_cols on public.profiles;
--   drop function if exists public.profiles_guard_privileged_cols();
--   alter policy "profiles_update" on public.profiles using (id = auth.uid()) with check (true);
-- ===========================================================================

-- security invoker (ค่าเริ่มต้นของ plpgsql) — จงใจไม่ใช้ security definer
-- เพื่อให้ current_user สะท้อน role ผู้เรียกจริง (authenticated/anon/service_role)
create or replace function public.profiles_guard_privileged_cols()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('authenticated', 'anon') then
    -- ผู้ใช้ทั่วไปผ่าน PostgREST — ห้ามเปลี่ยนคอลัมน์สิทธิ์ คงค่าเดิมไว้
    new.org_id := old.org_id;
    new.role   := old.role;
    new.id     := old.id;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_privileged_cols on public.profiles;
create trigger profiles_guard_privileged_cols
  before update on public.profiles
  for each row
  execute function public.profiles_guard_privileged_cols();

-- คง using เดิม + เพิ่ม with check
alter policy "profiles_update" on public.profiles
  using (id = auth.uid())
  with check (id = auth.uid());
