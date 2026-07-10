-- 0029_promo_prices_v2.sql
-- ปรับแพ็คเกจโปรโมทใหม่: 15 วัน 69 · 30 วัน 109 · 90 วัน 149 (แทนชุดเดิม 7/30/90)
delete from public.promo_prices where days not in (15, 30, 90);
insert into public.promo_prices (days, price) values (15, 69), (30, 109), (90, 149)
on conflict (days) do update set price = excluded.price, updated_at = now();
