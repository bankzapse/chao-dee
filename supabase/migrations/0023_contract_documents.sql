-- 0023_contract_documents.sql — เอกสารแนบของสัญญาเช่า (สัญญา/อื่นๆ)
-- เก็บไฟล์ใน storage bucket 'documents' ที่มีอยู่แล้ว

create table if not exists public.contract_documents (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  doc_type    text not null default 'contract',   -- 'contract' | 'other'
  file_path   text not null,
  note        text not null default '',
  created_at  timestamptz not null default now()
);
alter table public.contract_documents enable row level security;
drop policy if exists "contract_documents_all" on public.contract_documents;
create policy "contract_documents_all" on public.contract_documents
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
