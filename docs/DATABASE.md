# ChaoDee — Backend Database (Data Model)

PostgreSQL บน Supabase · Multi-tenant ด้วย Row Level Security (RLS) · 20 ตาราง

## แนวคิดหลัก (Multi-tenancy)
1 เจ้าของ = 1 **organization**. ทุกตารางมี `org_id` (ตรงหรือผ่านความสัมพันธ์) และ RLS บังคับให้เห็นเฉพาะข้อมูลของ org ตนเอง ผ่านฟังก์ชัน `current_org_id()` (อ่าน org จาก `profiles` ของผู้ล็อกอิน)

```
auth.users ──1:1── profiles ──N:1── organizations
                                        │
        ┌──────────────┬───────────────┼───────────────┬──────────────┐
     buildings      tenants        (org settings:    building_        announcements
        │              │            promptpay,        expenses
     rooms ◄───────────┼────┐       invoice_note)
        │              │    │
   meter_readings   contracts │
        │              │    │
     invoices ◄────────┘    │
        │  │                │
 invoice_items payments     │
                            │
   maintenance_requests · parcels · vehicles · documents
   (อ้าง room_id / tenant_id)
```

## ตารางทั้งหมด (ตาม migration)

| กลุ่ม | ตาราง | ความสัมพันธ์หลัก |
|---|---|---|
| **แกน (0001)** | organizations, profiles, buildings, rooms, tenants, contracts, building_expenses, documents | rooms→buildings, contracts→(rooms,tenants) |
| **การเงิน (0004)** | meter_readings, invoices, invoice_items, payments | invoices→(rooms,tenants,contracts), payments→invoices |
| **LINE (0005)** | announcements (+ `tenants.line_link_code`) | org-scoped |
| **ปฏิบัติการ (0006)** | maintenance_requests, parcels, vehicles | อ้าง rooms/tenants |

## Enums
`room_status` (vacant/occupied/reserved/maintenance) · `contract_status` (active/ended/terminated) · `member_role` (owner/admin/staff) · `invoice_status` (unpaid/partial/paid/void) · `payment_method` · `maintenance_status` · `parcel_status` · `vehicle_type`

## Automation (Triggers/Functions)
- `handle_new_user()` — สมัคร → สร้าง organization + profile อัตโนมัติ
- `current_org_id()` — SECURITY DEFINER helper สำหรับ RLS
- `recompute_invoice_paid()` — เมื่อ insert/update/delete `payments` → คำนวณ `paid_amount` + อัปเดต `status` บิลอัตโนมัติ

## Security
- **RLS เปิดทุกตาราง** — policy `org_id = current_org_id()` (หรือผ่าน join)
- **Grants** (0003): `authenticated` + `service_role` ได้ CRUD + `alter default privileges` ให้ตารางใหม่ได้สิทธิ์อัตโนมัติ
- **Storage**: bucket `documents`, `slips` แบบ private + policy เฉพาะผู้ล็อกอิน
- service_role ใช้เฉพาะ LINE webhook (ไม่มี session) — เก็บ key ฝั่ง server เท่านั้น

## Indexes (มีแล้ว)
org_id ทุกตาราง, unique `(building_id, room_number)`, unique `(room_id, period)` สำหรับ meter/invoice, index สถานะบิล/งานซ่อม/พัสดุ, index `line_user_id`/`line_link_code`

---

## Production-ready ✅ / ต่อยอดเมื่อสเกลใหญ่ 🔜

**พร้อมแล้ว:** schema + RLS + grants + triggers + storage + migration history ครบ รันขึ้น cloud ได้ทันที (ดู PRODUCTION.md Phase 1)

**ควรเพิ่มก่อน/ระหว่างโต:**
- 🔜 `updated_at` trigger กลาง (ตอนนี้มีเฉพาะบางตาราง) เพื่อ audit
- 🔜 **Audit log** ตาราง `activity_log` (ใคร ทำอะไร เมื่อไร) — สำคัญเมื่อมีทีม staff
- 🔜 **Soft delete** (`deleted_at`) สำหรับ tenants/contracts แทนการลบจริง (เก็บประวัติ)
- 🔜 **Partition** ตาราง `invoices`/`meter_readings` แบบรายปี เมื่อข้อมูลเกินหลักแสนแถว
- 🔜 `payments.slip_path` + AI ตรวจสลิป (SlipOK/EasySlip) ยืนยันยอดอัตโนมัติ
- 🔜 Materialized view สำหรับรายงาน (ถ้ากราฟช้าเมื่อข้อมูลเยอะ)
- 🔜 Scheduled job (pg_cron) — mark บิล overdue, ส่งเตือน LINE ก่อนครบกำหนด

## Migration workflow (production)
```bash
# แก้ schema → สร้างไฟล์ใหม่ 000N_xxx.sql เสมอ (ไม่แก้ไฟล์เก่าที่รันไปแล้ว)
npx supabase migration new <name>
npx supabase db push          # ขึ้น cloud
```
