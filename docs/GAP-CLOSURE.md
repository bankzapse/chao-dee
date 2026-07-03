# ChaoDee — สรุปการปิด Gap & Activation Checklist

เอกสารนี้สรุปสิ่งที่สร้างเสร็จแล้ว และขั้นตอนที่ต้องทำฝั่งผู้ดูแล (external accounts / env) เพื่อเปิดใช้ฟีเจอร์เสริมและทำให้พร้อม production เต็มรูปแบบ

## ✅ สร้างเสร็จแล้ว (อยู่ในโค้ด/ดีพลอยแล้ว)

- ทางเข้าเจ้าของระบบ (เบอร์+รหัสผ่าน) ที่ `/owner-login`
- บังคับเพดานแพ็คเกจ (อาคาร/ห้อง/ผู้เช่า) ตอนสร้าง
- PDPA: `/privacy`, `/terms`, consent ตอนสมัคร
- Rate limit + auth บน `/api/ai/read-meter`
- Sentry (error monitoring) — โครงพร้อม เปิดเมื่อใส่ DSN
- แจ้งเตือนเจ้าของ: badge คำขอค้าง + SMS เมื่อมีคำขอต่ออายุ
- ระบบเชิญทีมงาน (`/team`) — เชิญด้วยเบอร์, สิทธิ์ owner/admin/staff
- SEO: metadata, OG image, `robots.txt`, `sitemap.xml`, favicon
- ใบเสร็จค่าแพ็คเกจ (พิมพ์ได้) ที่ `/renew/receipt/[id]`
- Export CSV รายงานในแผงเจ้าของ
- Unit tests (vitest) — `npm test`
- Audit log (`/owner/audit`)
- คูปองส่วนลด (`/owner/promos`)
- ตัวเชื่อมตรวจสลิปอัตโนมัติ (EasySlip/SlipOK) — เปิดเมื่อใส่ env
- ตั้งค่า LINE Rich Menu อัตโนมัติ — `POST /api/line/setup-richmenu`

## 🔧 Activation Checklist (ฝั่งผู้ดูแล)

### จำเป็นก่อนเปิดจริง
- [ ] **SMSOK** verify บัญชี + อนุมัติ sender "Chao-Dee" (ตอนนี้ test mode — OTP จริงยังไม่ส่ง)
- [ ] **Vercel env**: `CRON_SECRET`, `NEXT_PUBLIC_PLATFORM_PROMPTPAY` แล้ว redeploy
- [ ] เติมข้อมูลบริษัทใน `/privacy` และหัวใบเสร็จ (`[ชื่อบริษัท]`, `[เลขผู้เสียภาษี]`)

### ฟีเจอร์เสริม (ตั้ง env บน Vercel แล้วใช้ได้)
- [ ] **Sentry**: สมัคร sentry.io → ตั้ง `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN` (และ `SENTRY_ORG/PROJECT/AUTH_TOKEN` สำหรับ source map)
- [ ] **ตรวจสลิปอัตโนมัติ**: สมัคร EasySlip/SlipOK → ตั้ง `SLIP_VERIFY_URL`, `SLIP_VERIFY_KEY` (คำขอต่ออายุจะตรวจยอดอัตโนมัติและแปะผลใน note)
- [ ] **LINE Rich Menu**: ตั้ง `LINE_CHANNEL_ACCESS_TOKEN/SECRET` แล้วเรียก
      `curl -X POST https://www.chao-dee.com/api/line/setup-richmenu -H "Authorization: Bearer $CRON_SECRET"`
- [ ] **AI อ่านมิเตอร์**: ตั้ง `ANTHROPIC_API_KEY`

### งานปฏิบัติการ
- [ ] **Supabase backup/PITR**: อัปเกรดเป็น Pro plan เพื่อ daily backup + PITR แล้วทดสอบ restore
- [ ] ตรวจ Cloudflare DNS ของโดเมนเป็น "DNS only" (grey cloud) ให้ Vercel ออก SSL ได้

## 🗺️ Roadmap (ยังไม่ทำ — ต้องใช้บริการภายนอก/บัญชีเพิ่ม)

- **Payment gateway** ตัดบัตรเครดิต/ตัดเงินอัตโนมัติ (Omise/Stripe/2C2P) — ตอนนี้เป็น PromptPay + แนบสลิป + ตรวจด้วยมือ/สลิป
- **Refund / Dunning** (คืนเงิน, ทวงชำระซ้ำเมื่อ fail) — ผูกกับ payment gateway
- **แอปมือถือ (Expo)** build + publish ขึ้น App Store / Play Store — ต้องใช้บัญชี Apple Developer ($99/ปี) + Google Play ($25) และรัน `eas build`/`eas submit`
- **Export PDF** รายงาน (ตอนนี้มี CSV + ใบเสร็จพิมพ์ผ่านเบราว์เซอร์)
