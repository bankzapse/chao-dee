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
  r public.rate_limits%rowtype;
  now_ts timestamptz := now();
  win interval := (p_window_ms || ' milliseconds')::interval;
begin
  insert into public.rate_limits(key, count, reset_at)
    values (p_key, 1, now_ts + win)
  on conflict (key) do update
    set count = case when public.rate_limits.reset_at <= now_ts then 1
                     else public.rate_limits.count + 1 end,
        reset_at = case when public.rate_limits.reset_at <= now_ts then now_ts + win
                        else public.rate_limits.reset_at end
  returning * into r;

  if r.count > p_limit then
    return query select false, greatest(1, ceil(extract(epoch from (r.reset_at - now_ts)))::int);
  else
    return query select true, 0;
  end if;
end;
$$;
grant execute on function public.rate_limit_hit(text, int, int) to service_role;

-- ดัชนีช่วยเก็บกวาดแถวหมดอายุ (ออปชัน)
create index if not exists rate_limits_reset_at_idx on public.rate_limits(reset_at);
