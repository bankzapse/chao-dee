# ChaoDee Mobile (Expo)

แอปมือถือสำหรับ **เจ้าของ/ผู้ดูแลหอพัก** — เชื่อมฐานข้อมูล Supabase เดียวกับเว็บ

## ฟีเจอร์ (MVP 6)
- เข้าสู่ระบบด้วยบัญชีเดียวกับเว็บ
- แดชบอร์ดสรุป (อัตราเข้าพัก, รายได้, ห้องว่าง)
- **จดมิเตอร์ด้วยกล้อง** — ถ่ายรูปหน้าปัดมิเตอร์ → AI อ่านค่า → บันทึกเข้าระบบ

## เริ่มใช้งาน

```bash
cd mobile
npm install
cp .env.example .env      # ใส่ค่า Supabase + URL เว็บแอป
npx expo start            # สแกน QR ด้วย Expo Go หรือกด i / a เปิด simulator
```

> **หมายเหตุ:** ฟีเจอร์ AI อ่านมิเตอร์เรียก `POST {EXPO_PUBLIC_API_URL}/api/ai/read-meter` ของเว็บแอป
> เมื่อทดสอบบนมือถือจริง ให้ตั้ง `EXPO_PUBLIC_API_URL` เป็น IP ของเครื่องรันเว็บ (เช่น `http://192.168.1.10:3000`)
> และ `EXPO_PUBLIC_SUPABASE_URL` ให้เข้าถึงได้จากมือถือด้วย (ใช้ Supabase cloud หรือ IP เครื่อง)

## โครงสร้าง
```
mobile/
├── App.tsx                    # auth state + สลับ Login/Home
└── src/
    ├── lib/supabase.ts        # Supabase client (AsyncStorage)
    └── screens/
        ├── LoginScreen.tsx
        ├── HomeScreen.tsx     # แท็บ Dashboard / Meter
        ├── DashboardScreen.tsx
        └── MeterScreen.tsx    # ถ่ายรูป → AI อ่านมิเตอร์
```
