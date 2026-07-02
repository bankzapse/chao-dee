# ChaoDee (เช่าดี) — แผนขึ้น Production 🚀

โดเมน: **chao-dee.com** · Stack: Next.js (Vercel) + Supabase (PostgreSQL) + LINE OA + Anthropic + Expo

เอกสารนี้คือแผนทุกขั้นตอนตั้งแต่ backend/database จนเปิดใช้งานจริง — ทำตามเป็นเฟส (0 → 7)

---

## ภาพรวมสถาปัตยกรรม Production

```
                 chao-dee.com (DNS: registrar → Vercel)
                          │  HTTPS (auto TLS)
                          ▼
        ┌──────────────── Vercel ────────────────┐
        │  Next.js (web + API routes)             │
        │   /api/line/webhook   /api/ai/read-meter│
        └───────┬───────────────┬─────────────────┘
                │ supabase-js    │ fetch
                ▼                ▼
   Supabase Cloud (Postgres)   LINE Messaging API / Anthropic API
   - RLS + grants (0001–0006)
   - Auth (email)              Expo app (EAS build) → chao-dee.com/api/*
   - Storage (documents, slips)
   - Daily backup / PITR
```

**หลักความปลอดภัย:** `service_role key` และ `ANTHROPIC_API_KEY`, `LINE_CHANNEL_SECRET` = server-only (ห้ามขึ้นต้น `NEXT_PUBLIC_`) เก็บใน Vercel Environment Variables เท่านั้น

---

## Phase 0 — เตรียมบัญชี (ทำครั้งเดียว)

| บริการ | ใช้ทำอะไร | แพ็กเกจแนะนำ |
|---|---|---|
| **Supabase** | Database + Auth + Storage | Pro ($25/เดือน — ได้ daily backup, PITR, ไม่ pause) |
| **Vercel** | โฮสต์เว็บ + API | Hobby (ฟรี) เริ่มได้ / Pro ($20) เมื่อมีทีม |
| **LINE Developers** | Messaging API (OA) | ฟรี (Developer trial) → Verified/Premium ตามปริมาณ |
| **Anthropic Console** | AI อ่านมิเตอร์ | Pay-as-you-go (เติมเครดิต) |
| **Expo (EAS)** | build แอปมือถือ | ฟรี / Production ($) เมื่อ submit สโตร์ |
| **Registrar โดเมน** | chao-dee.com (มีแล้ว ✅) | ชี้ DNS ไป Vercel |

---

## Phase 1 — Database บน Supabase Cloud ⭐ (หัวใจ backend)

### 1.1 สร้างโปรเจกต์
- สร้าง project ใหม่ที่ supabase.com → **Region: Singapore (ap-southeast-1)** (ใกล้ไทยสุด latency ต่ำ)
- ตั้ง **Database Password** ที่แข็งแรง เก็บใน password manager
- จดค่า: `Project URL`, `anon key`, `service_role key` (Settings → API)

### 1.2 รัน migrations (เลือกวิธีใดวิธีหนึ่ง)

**วิธี A — Supabase CLI (แนะนำ, ทำซ้ำได้):**
```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push        # รัน 0001–0006 ตามลำดับขึ้น cloud
```

**วิธี B — SQL Editor:** เปิด Supabase Studio → SQL Editor → รันไฟล์ตามลำดับ
`0001_init` → `0002_rls` → `0003_grants` → `0004_billing` → `0005_line` → `0006_operations`

### 1.3 ตรวจความถูกต้องหลัง migrate (สำคัญ)
```sql
-- ต้องได้ 16 ตาราง
select count(*) from pg_tables where schemaname='public';
-- ทุกตารางต้องเปิด RLS
select tablename, rowsecurity from pg_tables where schemaname='public' and rowsecurity=false;
-- authenticated + service_role ต้องมีสิทธิ์ (จาก 0003_grants)
select has_table_privilege('authenticated','public.invoices','select');
select has_table_privilege('service_role','public.tenants','update');
```

### 1.4 ตั้งค่า Auth (Production)
- **Authentication → URL Configuration:**
  - Site URL: `https://chao-dee.com`
  - Redirect URLs: `https://chao-dee.com/**`
- **Email:** เปิด "Confirm email" = **ON** (production ควรยืนยันอีเมลจริง)
- **Custom SMTP** (สำคัญ! default ของ Supabase จำกัด ~3 อีเมล/ชม.): ตั้งค่า SMTP ของ Resend / SendGrid / Amazon SES เพื่อส่งอีเมลยืนยัน/รีเซ็ตรหัสได้จริง
- แก้ template อีเมลเป็นภาษาไทย + แบรนด์ ChaoDee

### 1.5 Storage
- Bucket `documents` และ `slips` ถูกสร้างโดย migration แล้ว (private + RLS policy)
- ตรวจว่า policy อนุญาตเฉพาะผู้ล็อกอิน (มีใน 0002/0004)

### 1.6 Backup & Recovery
- Pro plan: **daily backup อัตโนมัติ** (เก็บ 7 วัน) + **PITR** (point-in-time recovery)
- **ทดสอบ restore จริง 1 ครั้ง** ก่อนเปิดใช้ (สร้าง project ทดลอง restore)
- ตั้งเตือนปฏิทินรีวิว backup รายเดือน

### 1.7 Connection pooling
- แอปใช้ `supabase-js` (PostgREST) → pooling จัดการให้อัตโนมัติ เหมาะกับ serverless (Vercel) อยู่แล้ว ✅
- ถ้าอนาคตต่อ pg โดยตรง ให้ใช้ **Transaction pooler (port 6543)** ไม่ใช่ direct 5432

---

## Phase 2 — Deploy เว็บบน Vercel

### 2.1 เชื่อม repo
- push โค้ดขึ้น GitHub (ดู Phase ถัดไปเรื่อง git) → Vercel → Import Project → เลือก repo
- Framework: Next.js (auto) · Root Directory: `./` (ไม่ใช่ `mobile/`)

### 2.2 Environment Variables (Vercel → Settings → Environment Variables)

| Key | ค่า | Scope |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL จาก Supabase | Production |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key | Production |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key (**server-only**) | Production |
| `LINE_CHANNEL_ACCESS_TOKEN` | จาก Phase 3 | Production |
| `LINE_CHANNEL_SECRET` | จาก Phase 3 | Production |
| `ANTHROPIC_API_KEY` | จาก Phase 4 | Production |

> ตั้งชุดเดียวกันใน scope **Preview** ด้วย (ชี้ Supabase project แยกสำหรับ staging จะดีที่สุด)

### 2.3 Custom Domain
- Vercel → Domains → เพิ่ม `chao-dee.com` และ `www.chao-dee.com`
- ที่ registrar ตั้ง DNS:
  - `A` record `@` → `76.76.21.21` (Vercel) **หรือ** ใช้ nameserver ของ Vercel
  - `CNAME` `www` → `cname.vercel-dns.com`
- Vercel ออก TLS (HTTPS) อัตโนมัติ · ตั้ง redirect `www` → root (หรือกลับกัน)

### 2.4 Deploy + smoke test
- Deploy → เปิด `https://chao-dee.com` → สมัคร/ล็อกอิน → กด "โหลดข้อมูลตัวอย่าง" → ตรวจทุกเมนู

---

## Phase 3 — LINE OA (Production)

1. LINE Developers Console → สร้าง **Provider** → **Messaging API channel**
2. คัดลอก **Channel secret** และออก **Channel access token (long-lived)** → ใส่ใน Vercel env (Phase 2.2) → redeploy
3. **Webhook:** ตั้ง Webhook URL = `https://chao-dee.com/api/line/webhook` → กด **Verify** (ต้องได้ 200) → เปิด "Use webhook" = ON
4. ปิด auto-reply/greeting เดิมของ LINE (ให้ระบบตอบเอง)
5. ตั้ง **Rich Menu**: ยอดค้าง · บิล · แจ้งซ่อม · พัสดุ · ห้อง (ลิงก์คำสั่ง text)
6. ทดสอบ: แอดเพื่อน OA → ผูกบัญชี (สร้างรหัสจากเมนูผู้เช่า) → พิมพ์ "ยอดค้าง"

---

## Phase 4 — AI (Anthropic)

1. Anthropic Console → เติมเครดิต / ตั้ง billing + usage limit กันบิลบานปลาย
2. สร้าง **API key** → ใส่ `ANTHROPIC_API_KEY` ใน Vercel → redeploy
3. โมเดล: `claude-opus-4-8` (vision) · ต้นทุนต่อการอ่าน 1 รูป ต่ำมาก
4. (แนะนำ) ใส่ rate limit ที่ route `/api/ai/read-meter` กัน abuse

---

## Phase 5 — แอปมือถือ (Expo EAS)

1. `cd mobile` → ตั้ง `.env`: `EXPO_PUBLIC_SUPABASE_URL/ANON_KEY` = ค่า cloud, `EXPO_PUBLIC_API_URL=https://chao-dee.com`
2. `npx eas login` → `npx eas build:configure`
3. Build: `eas build -p android` / `eas build -p ios`
4. แจกแบบ internal (APK/TestFlight) หรือ submit สโตร์: `eas submit`
5. iOS ต้องมี Apple Developer ($99/ปี) · Android ต้องมี Play Console ($25 ครั้งเดียว)

---

## Phase 6 — Production Hardening (ก่อนเปิดจริง)

- [ ] **Secrets:** ยืนยันว่าไม่มี key ใดขึ้นต้น `NEXT_PUBLIC_` นอกจาก URL/anon · service_role/LINE_SECRET/ANTHROPIC อยู่ server เท่านั้น
- [ ] **Custom SMTP** สำหรับอีเมล auth (Phase 1.4) — จำเป็นถ้ามีผู้ใช้จริง
- [ ] **Rate limiting** ที่ `/api/line/webhook` และ `/api/ai/read-meter` (เช่น Upstash Ratelimit)
- [ ] **Monitoring:** เปิด Vercel Analytics + Supabase Logs · ต่อ **Sentry** จับ error
- [ ] **PDPA (พรบ.คุ้มครองข้อมูลส่วนบุคคล):** เพิ่มหน้า Privacy Policy + Terms · ขอ consent เก็บข้อมูลผู้เช่า (เลขบัตร ปชช. = ข้อมูลอ่อนไหว)
- [ ] **RLS audit:** ยืนยันทุกตารางแยกข้อมูลตาม org (ทดสอบด้วย 2 บัญชี)
- [ ] **Backup restore test** ผ่านแล้ว (Phase 1.6)
- [ ] **สำรอง service_role key / DB password** ใน password manager
- [ ] **Staging environment** แยก Supabase project เพื่อทดสอบก่อนขึ้น prod

---

## Phase 7 — Go-Live Checklist

- [ ] Supabase cloud: 16 ตาราง + RLS + grants ครบ, backup เปิด, SMTP ตั้งแล้ว
- [ ] Vercel: env ครบทุกตัว, custom domain + HTTPS เขียว
- [ ] LINE webhook Verify ผ่าน (200), rich menu พร้อม
- [ ] AI: key + billing limit ตั้งแล้ว
- [ ] สมัคร/ล็อกอิน/ออกบิล/ชำระ/PromptPay/พิมพ์ PDF ผ่านบน production จริง
- [ ] ผูก LINE + เช็คยอด + แจ้งซ่อม ผ่านบน OA จริง
- [ ] มือถือ: build + login + ถ่ายมิเตอร์ผ่าน
- [ ] Privacy/Terms + PDPA consent ขึ้นแล้ว
- [ ] Monitoring + error tracking ทำงาน
- [ ] ทีมมี runbook + rollback plan (Vercel redeploy รุ่นก่อน / Supabase PITR)

---

## ประมาณการค่าใช้จ่าย (เริ่มต้น/เดือน)

| รายการ | ค่าใช้จ่าย |
|---|---|
| Supabase Pro | ~$25 |
| Vercel | $0 (Hobby) → $20 (Pro) |
| Anthropic | ตามใช้จริง (หลัก $ ต่ำ สำหรับ OCR) |
| LINE OA | ฟรี (ตาม quota ข้อความ) |
| โดเมน | ~$10/ปี (จ่ายแล้ว) |
| **รวมเริ่มต้น** | **~$25–50/เดือน** |

---

## ลำดับแนะนำในการลงมือ

1. Git init + push ขึ้น GitHub (private repo)
2. Phase 1 — Supabase cloud + migrate + verify (backend พร้อม)
3. Phase 2 — Vercel + domain (เว็บออนไลน์)
4. Phase 3 & 4 — LINE + AI (ฟีเจอร์เสริมครบ)
5. Phase 6 — hardening (SMTP, PDPA, monitoring)
6. Phase 7 — go-live checklist → เปิดจริง
7. Phase 5 — แอปมือถือ (ทำคู่ขนานได้)
```
