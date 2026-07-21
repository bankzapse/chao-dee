"use client";

import { useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { formatPeriod } from "@/lib/format";
import { Spinner } from "./spinner";

export function PeriodSelect({
  periods,
  value,
  paramName = "period",
}: {
  periods: string[];
  value: string;
  paramName?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // การเปลี่ยน dropdown ไม่ใช่การกดปุ่ม จึงไม่มีอะไรบอกว่ากำลังโหลด — ใช้ transition คุมเอง
  const [pending, startTransition] = useTransition();

  // คงพารามิเตอร์อื่นไว้ (เช่น อาคารที่เลือก) ไม่ให้หายตอนสลับรอบเดือน
  function go(next: string) {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set(paramName, next);
    startTransition(() => router.push(`${pathname}?${sp.toString()}`));
  }

  return (
    <span className="inline-flex items-center gap-2">
      <select
        className="field w-auto disabled:opacity-60"
        value={value}
        disabled={pending}
        onChange={(e) => go(e.target.value)}
      >
        {periods.map((p) => (
          <option key={p} value={p}>
            {formatPeriod(p)}
          </option>
        ))}
      </select>
      {pending && <Spinner className="text-indigo-600" />}
    </span>
  );
}
