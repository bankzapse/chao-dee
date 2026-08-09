import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  async headers() {
    // headers ความปลอดภัยพื้นฐาน — ไม่กระทบ framing (ใส่ได้ทุกหน้า)
    const base = [
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    ];
    return [
      { source: "/:path*", headers: base },
      // กัน clickjacking — แต่ "ยกเว้น" /liff และ /bill ที่เปิดผ่าน LINE (กัน webview พัง ตามที่เตือน)
      {
        source: "/((?!liff|bill).*)",
        headers: [{ key: "X-Frame-Options", value: "SAMEORIGIN" }],
      },
    ];
  },
};

// ครอบด้วย Sentry — จะอัปโหลด source map เฉพาะเมื่อมี SENTRY_AUTH_TOKEN
// ถ้าไม่ตั้ง env ใด ๆ build จะทำงานปกติและ Sentry เป็น no-op
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  // หมายเหตุ: เลิกใช้ disableLogger (deprecated + ไม่รองรับ Turbopack ใน Next 16)
  // ถ้าต้องการตัด debug logging ของ Sentry ให้ใช้ webpack.treeshake.removeDebugLogging แทน
  telemetry: false,
});
