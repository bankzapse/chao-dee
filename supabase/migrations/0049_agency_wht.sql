-- 0049_agency_wht.sql
-- แบบ B: ผู้จ่ายเป็นนิติบุคคลหักภาษี ณ ที่จ่าย 3% → โอนสุทธิ + ต้องออกหนังสือรับรอง
-- เก็บ snapshot ตอนชำระ เพื่อกันเคสเปลี่ยนประเภทผู้เสียภาษีภายหลัง และไม่กระทบดีลเก่า
alter table public.agency_deals
  add column if not exists wht_amount numeric(12,2) not null default 0,  -- ภาษีหัก ณ ที่จ่าย 3% ที่ผู้จ่ายหักไว้
  add column if not exists net_amount numeric(12,2) not null default 0,  -- ยอดโอนสุทธิ (ฐาน + VAT − WHT)
  add column if not exists wht_ack_at timestamptz;                       -- เวลาที่เจ้าของหอยืนยันจะออกหนังสือรับรอง
