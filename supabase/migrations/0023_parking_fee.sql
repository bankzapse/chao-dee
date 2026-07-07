-- ค่าบริการจอดรถ (รายเดือน) ผูกกับห้องพัก แล้วรวมเข้าบิลอัตโนมัติ
alter table rooms add column if not exists parking_fee numeric not null default 0;
alter table invoices add column if not exists parking_amount numeric not null default 0;
