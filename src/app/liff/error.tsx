"use client";

import { useEffect } from "react";
import { TriangleAlert, RotateCw } from "lucide-react";

/** หน้า error ของ LIFF — กันไม่ให้ผู้เช่าเจอหน้า Error ดิบ ให้ลองใหม่/ผูกบัญชีใหม่ได้ */
export default function LiffError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // log ไว้ดูใน Vercel (ไม่โชว์รายละเอียดให้ผู้เช่า)
    console.error("LIFF error:", error);
  }, [error]);

  return (
    <div className="pt-8">
      <div className="mx-auto max-w-sm rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-100">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-500">
          <TriangleAlert className="h-7 w-7" strokeWidth={2} />
        </div>
        <h1 className="mt-3 text-lg font-bold text-slate-900">เปิดหน้านี้ไม่สำเร็จ</h1>
        <p className="mt-1 text-sm text-slate-500">
          เกิดข้อผิดพลาดชั่วคราว ลองใหม่อีกครั้ง — ถ้ายังไม่ได้ กรุณาผูกบัญชีใหม่ หรือติดต่อผู้ดูแลหอ
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white active:scale-[.98]"
          >
            <RotateCw className="h-4 w-4" strokeWidth={2.4} />
            ลองใหม่
          </button>
          <a
            href="/liff/link"
            className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 active:scale-[.98]"
          >
            ผูกบัญชีใหม่
          </a>
        </div>
      </div>
    </div>
  );
}
