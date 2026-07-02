# ChaoDee (เช่าดี) — ระบบจัดการหอพัก คอนโด อพาร์ตเมนต์

ระบบครบวงจรสำหรับเจ้าของที่พักให้เช่า — หอพัก · คอนโด · อพาร์ตเมนต์ (Web + Mobile + LINE OA)

## ฟีเจอร์ (MVP 1–6 ครบ)

| เมนู | ความสามารถ |
|---|---|
| แดชบอร์ด / รายงาน | สรุปภาพรวม, กราฟรายได้-ค่าใช้จ่าย, อัตราเข้าพัก, สัญญาใกล้หมด |
| อาคาร · ห้อง · ผังห้อง | จัดการไม่จำกัด + ผังห้องตามชั้นพร้อมสถานะสี |
| ผู้เช่า · สัญญา | CRUD + sync สถานะห้อง + เชื่อมบัญชี LINE |
| จดมิเตอร์ | กรอกเอง หรือ **AI อ่านจากรูปถ่าย** (Claude vision) + ตรวจค่าผิดปกติ |
| บิล/ใบแจ้งหนี้ | ออกบิลอัตโนมัติ, PromptPay QR, พิมพ์ PDF, บันทึกชำระ, ส่งผ่าน LINE |
| ประกาศ LINE | broadcast ถึงผู้เช่าที่ผูกบัญชี |
| แจ้งซ่อม · พัสดุ · ยานพาหนะ | จัดการ + แจ้งเตือน/รับคำสั่งผ่าน LINE |
| ค่าใช้จ่าย · ตั้งค่า · ช่วยเหลือ | ค่าใช้จ่ายอาคาร, PromptPay, คู่มือใช้งาน |

**ผู้เช่าใช้ผ่าน LINE OA** (เช็คยอด/แจ้งซ่อม/พัสดุ) — เจ้าของใช้ **Web + Mobile App** (Expo, ดู `mobile/`)

## Tech stack

- **Next.js 15** (App Router) + TypeScript + Tailwind CSS v4
- **Supabase** (PostgreSQL + Auth + Storage + Row Level Security)
- **LINE Messaging API** (webhook + push/broadcast)
- **Anthropic Claude** (vision อ่านมิเตอร์)
- **Expo / React Native** (แอปมือถือเจ้าของ)
- **PromptPay QR** (สร้าง payload offline ตาม EMVCo)

---

## เริ่มต้นใช้งาน

### 1. ติดตั้ง dependencies

```bash
npm install
```

### 2. เตรียมฐานข้อมูล Supabase

**ทางเลือก A — Supabase local (แนะนำสำหรับ dev, ต้องมี Docker)**

```bash
# ติดตั้ง Supabase CLI ครั้งแรก (ถ้ายังไม่มี)
npm install -g supabase

# สตาร์ท Supabase local (จะรัน migrations ใน supabase/migrations ให้อัตโนมัติ)
supabase start
```

เมื่อรันเสร็จจะได้ค่า `API URL` และ `anon key` ให้คัดลอกมาใส่ `.env.local`
ถ้าฐานข้อมูลยังไม่อัปเดต ให้รัน `supabase db reset` เพื่อรัน migration ใหม่

**ทางเลือก B — Supabase cloud**

1. สร้างโปรเจกต์ที่ https://supabase.com
2. เปิด **SQL Editor** แล้วรันไฟล์ตามลำดับ:
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_rls.sql`
3. คัดลอก URL + anon key จาก **Project Settings → API**

### 3. ตั้งค่า environment

```bash
cp .env.example .env.local
# แก้ไข .env.local ใส่ค่า NEXT_PUBLIC_SUPABASE_URL และ NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### 4. รันแอป

```bash
npm run dev
```

เปิด http://localhost:3000 → สมัครสมาชิก (ระบบจะสร้างองค์กรให้อัตโนมัติ)
→ ที่หน้าแดชบอร์ดกดปุ่ม **"🎁 โหลดข้อมูลตัวอย่าง"** เพื่อทดลองใช้งานได้ทันที

---

## โครงสร้างโปรเจกต์

```
src/
├── app/
│   ├── login/                 # หน้าเข้าสู่ระบบ/สมัคร + auth actions
│   └── (app)/                 # ส่วนที่ต้องล็อกอิน
│       ├── layout.tsx         # sidebar + topbar
│       ├── dashboard/         # แดชบอร์ดสรุปภาพรวม
│       ├── buildings/         # อาคาร
│       ├── rooms/             # ห้องพัก
│       ├── tenants/           # ผู้เช่า
│       ├── contracts/         # สัญญาเช่า
│       └── expenses/          # ค่าใช้จ่าย
├── components/                # UI ที่ใช้ร่วมกัน (modal, form, sidebar…)
└── lib/                       # supabase clients, types, format helpers
supabase/
├── config.toml                # ตั้งค่า Supabase local
└── migrations/                # schema + RLS
```

## การเปิดใช้บริการเสริม

- **LINE:** สร้าง Messaging API channel ที่ https://developers.line.biz ใส่ token/secret ใน `.env.local` แล้วตั้ง Webhook URL เป็น `https://<โดเมน>/api/line/webhook`
- **AI อ่านมิเตอร์:** ใส่ `ANTHROPIC_API_KEY` (จาก console.anthropic.com) ใน `.env.local`
- **แอปมือถือ:** ดู `mobile/README.md`

> ระบบทำงานได้เต็มรูปแบบแม้ยังไม่ตั้งค่า LINE/AI — ปุ่มที่เกี่ยวข้องจะแจ้งว่ายังไม่ได้ตั้งค่าอย่างสุภาพ

## Migrations

`supabase/migrations/` รันตามลำดับ: `0001` schema · `0002` RLS+trigger · `0003` grants · `0004` billing · `0005` LINE · `0006` operations
