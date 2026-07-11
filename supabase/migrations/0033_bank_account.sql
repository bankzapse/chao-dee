-- 0033_bank_account.sql
-- ช่องทางชำระเงินเพิ่มเติม: บัญชีธนาคารของเจ้าของหอ (แสดงในบิลคู่กับ PromptPay)
alter table public.organizations
  add column if not exists bank_name         text not null default '',
  add column if not exists bank_account_no   text not null default '',
  add column if not exists bank_account_name text not null default '';
