-- 0040_rate_limits.sql
-- Rate limiter ที่ใช้ได้ข้าม serverless instance (เดิม in-memory แยกตาม instance → เลี่ยงได้)
create table if not exists public.rate_limits (
  key       text primary key,
  count     int not null default 0,
  reset_at  timestamptz not null
);
alter table public.rate_limits enable row level security;
-- ไม่มี policy → เข้าถึงได้เฉพาะ service role (bypass RLS) เท่านั้น

-- เพิ่มตัวนับแบบ atomic; คืน allowed + retry_after(วินาที)
create or replace function public.rate_limit_hit(p_key text, p_limit int, p_window_ms int)
returns table(allowed boolean, retry_after int)
language plpgsql
security definer
set search_path = public
as $$
declare
  now_ts   timestamptz := now();
  win      interval := (p_window_ms || ' milliseconds')::interval;
  cur_cnt  int;
  cur_reset timestamptz;
begin
  -- ล็อกแถวเดิม (ถ้ามี) เพื่อกัน race
  select count, reset_at into cur_cnt, cur_reset
  from public.rate_limits where key = p_key for update;

  -- ยังไม่มี หรือหมด window เดิม → เริ่มนับใหม่
  if not found or cur_reset <= now_ts then
    insert into public.rate_limits(key, count, reset_at)
      values (p_key, 1, now_ts + win)
    on conflict (key) do update set count = 1, reset_at = now_ts + win;
    return query select true, 0;
    return;
  end if;

  -- เกิน limit ในช่วง window → ปฏิเสธ
  if cur_cnt >= p_limit then
    return query select false, greatest(1, ceil(extract(epoch from (cur_reset - now_ts)))::int);
    return;
  end if;

  -- ยังไม่เกิน → นับเพิ่ม
  update public.rate_limits set count = count + 1 where key = p_key;
  return query select true, 0;
end;
$$;
grant execute on function public.rate_limit_hit(text, int, int) to service_role;

-- ดัชนีช่วยเก็บกวาดแถวหมดอายุ (ออปชัน)
create index if not exists rate_limits_reset_at_idx on public.rate_limits(reset_at);
