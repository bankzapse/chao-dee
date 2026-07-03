import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// จับ error ที่เกิดใน server components / route handlers ส่งเข้า Sentry
export const onRequestError = Sentry.captureRequestError;
