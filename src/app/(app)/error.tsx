"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function AppError({
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
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-3xl">
          ⚠️
        </div>
        <h1 className="mt-4 text-xl font-bold text-slate-900">เกิดข้อผิดพลาด</h1>
        <p className="mt-2 text-sm text-slate-500">
          ระบบขัดข้องชั่วคราว ทีมงานได้รับแจ้งแล้ว กรุณาลองใหม่อีกครั้ง
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            onClick={() => window.history.back()}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50"
          >
            ← ย้อนกลับ
          </button>
          <button
            onClick={() => reset()}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white transition hover:bg-indigo-500"
          >
            ลองใหม่
          </button>
        </div>
      </div>
    </div>
  );
}
