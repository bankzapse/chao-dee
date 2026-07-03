"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="th">
      <body>
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-3xl">
              ⚠️
            </div>
            <h1 className="mt-4 text-xl font-bold text-slate-900">เกิดข้อผิดพลาด</h1>
            <p className="mt-2 text-sm text-slate-500">
              ระบบขัดข้องชั่วคราว ทีมงานได้รับแจ้งแล้ว กรุณาลองใหม่อีกครั้ง
            </p>
            <button
              onClick={() => reset()}
              className="mt-6 w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white transition hover:bg-indigo-500"
            >
              ลองใหม่
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
