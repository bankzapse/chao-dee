"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { formatPeriod } from "@/lib/format";

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

  // คงพารามิเตอร์อื่นไว้ (เช่น อาคารที่เลือก) ไม่ให้หายตอนสลับรอบเดือน
  function go(next: string) {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set(paramName, next);
    router.push(`${pathname}?${sp.toString()}`);
  }

  return (
    <select className="field w-auto" value={value} onChange={(e) => go(e.target.value)}>
      {periods.map((p) => (
        <option key={p} value={p}>
          {formatPeriod(p)}
        </option>
      ))}
    </select>
  );
}
