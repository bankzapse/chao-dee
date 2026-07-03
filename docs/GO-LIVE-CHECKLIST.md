# ✅ ChaoDee — Go-Live Checklist (สรุปที่เดียว กันลืม)

> อัปเดตล่าสุด: 3 กรกฎาคม 2568 · โดเมน: https://www.chao-dee.com · Supabase ref: `fyawvarwmjlpqtbxvvyv`

สถานะ: **โค้ด/ฟีเจอร์พร้อม production แล้ว** — เหลือเฝ้าดูงาน config ที่เหลือ

---

## 🔴 Blocker — ต้องเสร็จก่อนเปิดจริง

| # | รายการ | สถานะ | หมายเหตุ |
|---|--------|:-----:|----------|
| 1 | `CRON_SECRET` บน Vercel | ✅ เสร็จ | ยืนยันแล้ว: no-auth→401, with-secret→200 |
| 2 | `NEXT_PUBLIC_PLATFORM_PROMPTPAY` บน Vercel | ✅ เสร็จ | พร้อมเพย์บริษัทไว้รับค่าแพ็คเกจ |
| 3 | ข้อมูลบริษัทใน PDPA + ใบเสร็จ | ✅ เสร็จ | บริษัท เช่าดี จำกัด · เลขผู้เสียภาษี 0245569003051 (`src/lib/company.ts`) |
| 4 | SMSOK verify + อนุมัติ sender "Chao-Dee" | ✅ เสร็จ | OTP จริงส่งถึงลูกค้าได้ |

**→ ครบทั้ง 4 ข้อ = เปิดใช้จริงได้**

---

## 🟡 ควรทำเร็ว ๆ นี้ (ไม่บล็อกการเปิด)

| รายการ | สถานะ | วิธีทำ |
|--------|:-----:|--------|
| ลบ test OTP ออกจาก Supabase | ✅ เสร็จ | ลบแล้ว (66900000009) |
| ปรับ rate limit เป็น production | ✅ เสร็จ | otp/verify 60, sms_sent 50 |
| Sentry (error monitoring) | ⬜ รอ | สมัคร sentry.io → ใส่ env `NEXT_PUBLIC_SENTRY_DSN` + `SENTRY_DSN` บน Vercel |
| Supabase backup / PITR | ⬜ รอ | อัปเกรด **Pro plan** ใน Supabase → เปิด PITR → ทดสอบ restore |
| `ANTHROPIC_API_KEY` (AI อ่านมิเตอร์) | ⬜ ถ้าใช้ | ใส่ env บน Vercel |
| `LINE_CHANNEL_ACCESS_TOKEN/SECRET` | ⬜ ถ้าใช้ | ใส่ env → เรียก `POST /api/line/setup-richmenu` (Bearer CRON_SECRET) |
| ตรวจสลิปอัตโนมัติ (EasySlip/SlipOK) | ⬜ ถ้าใช้ | ใส่ env `SLIP_VERIFY_URL` + `SLIP_VERIFY_KEY` |

---

## 🟢 Roadmap (ต้องบัญชี/บริการภายนอก)

- Payment gateway ตัดบัตร (Omise/Stripe/2C2P) + refund/dunning
- แอปมือถือ (Expo) publish ขึ้น App Store / Play Store
- E2E automated tests (ตอนนี้มี unit tests 20 ตัว: `npm test`)

---

## 🔑 ทางเข้า 2 ระบบ (แยกกัน)

| ระบบ | URL | เข้าด้วย |
|------|-----|---------|
| แผงเจ้าของระบบ (ทีม ChaoDee) | `/owner-login` | เบอร์ + รหัสผ่าน |
| แอปจัดการหอ (เจ้าของหอ) | `/login` | เบอร์ + รหัสผ่าน หรือ OTP |

- ลืมรหัสผ่าน: `/forgot-password` (ยืนยันด้วย OTP)
- เข้า `/owner/*` โดยไม่ล็อกอิน → เด้งไป `/owner-login` อัตโนมัติ

---

## 🧩 Environment Variables ทั้งหมด (Vercel)

**จำเป็น:**
`NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_ANON_KEY` · `SUPABASE_SERVICE_ROLE_KEY` ·
`SEND_SMS_HOOK_SECRET` · `SMS_API_URL` · `SMS_API_KEY` · `SMS_SENDER` ·
`CRON_SECRET` · `NEXT_PUBLIC_PLATFORM_PROMPTPAY`

**ตัวเลือก (เปิดฟีเจอร์เสริม):**
`ANTHROPIC_API_KEY` · `LINE_CHANNEL_ACCESS_TOKEN` · `LINE_CHANNEL_SECRET` ·
`NEXT_PUBLIC_SENTRY_DSN` · `SENTRY_DSN` · `SLIP_VERIFY_URL` · `SLIP_VERIFY_KEY` ·
`NEXT_PUBLIC_COMPANY_NAME` · `NEXT_PUBLIC_COMPANY_ADDRESS` · `NEXT_PUBLIC_COMPANY_TAX_ID`
(ข้อมูลบริษัทมี fallback ในโค้ดแล้ว — ตั้ง env เฉพาะเวลาต้องการเปลี่ยน)

---

## 🔧 คำสั่งที่ใช้บ่อย

```bash
npm run dev        # รัน dev server
npm run build      # build production
npm test           # รัน unit tests
# ต่อ rich menu LINE (หลังตั้ง LINE token):
curl -X POST https://www.chao-dee.com/api/line/setup-richmenu \
  -H "Authorization: Bearer $CRON_SECRET"
```

---

## 📦 สรุปฟีเจอร์ที่มีในระบบ

จัดการอาคาร/ห้อง/ผู้เช่า/สัญญา · จดมิเตอร์ + AI · ออกบิลอัตโนมัติ + PromptPay QR ·
LINE (บิล/แจ้งซ่อม/พัสดุ/ประกาศ) · แดชบอร์ด+รายงาน · แจ้งซ่อม/พัสดุ/ยานพาหนะ/ค่าใช้จ่าย ·
ทีมงาน (เชิญด้วยเบอร์) · แพ็คเกจ+ต่ออายุ+คูปอง+ใบเสร็จ · แผงเจ้าของระบบ (สมาชิก/ชำระเงิน/รายงาน/audit) ·
PDPA (privacy/terms) · SEO (OG/sitemap/robots)
