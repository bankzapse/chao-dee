-- 0011_audit.sql — บันทึกกิจกรรมสำคัญ (audit trail)
-- org_id = null หมายถึงกิจกรรมระดับแพลตฟอร์ม (ทีม ChaoDee)

create table if not exists public.audit_logs (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid references public.organizations(id) on delete set null,
  actor_id   uuid,
  actor_name text not null default '',
  action     text not null,
  target     text not null default '',
  meta       jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_org_idx on public.audit_logs(org_id, created_at desc);
create index if not exists audit_logs_created_idx on public.audit_logs(created_at desc);

alter table public.audit_logs enable row level security;

-- สมาชิกในกิจการเห็น log ของกิจการตัวเอง (การเขียนทำผ่าน service role เท่านั้น)
create policy "audit_select_org" on public.audit_logs
  for select using (org_id = public.current_org_id());
