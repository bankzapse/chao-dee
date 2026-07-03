import * as Sentry from "@sentry/nextjs";

// ทำงานเฉพาะเมื่อมี DSN — ถ้าไม่ตั้งค่าไว้ SDK จะเป็น no-op
Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  enabled: Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN),
});
