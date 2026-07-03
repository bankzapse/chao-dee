import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {};

// ครอบด้วย Sentry — จะอัปโหลด source map เฉพาะเมื่อมี SENTRY_AUTH_TOKEN
// ถ้าไม่ตั้ง env ใด ๆ build จะทำงานปกติและ Sentry เป็น no-op
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  disableLogger: true,
  telemetry: false,
});
