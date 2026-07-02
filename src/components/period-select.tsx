"use client";

import { useRouter, usePathname } from "next/navigation";
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

  return (
    <select
      className="field w-auto"
      value={value}
      onChange={(e) => router.push(`${pathname}?${paramName}=${e.target.value}`)}
    >
      {periods.map((p) => (
        <option key={p} value={p}>
          {formatPeriod(p)}
        </option>
      ))}
    </select>
  );
}
