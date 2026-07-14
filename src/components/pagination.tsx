import Link from "next/link";

/**
 * แถบแบ่งหน้าแบบ query-string (?page=N) — ใช้กับ server component
 * basePath = path ปัจจุบัน, params = query อื่นที่ต้องคงไว้ (เช่น q/status)
 */
export function Pagination({
  basePath,
  page,
  pageSize,
  total,
  params = {},
}: {
  basePath: string;
  page: number;
  pageSize: number;
  total: number;
  params?: Record<string, string | undefined>;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm">
      <span className="text-slate-500">
        {from.toLocaleString()}–{to.toLocaleString()} จาก {total.toLocaleString()}
      </span>
      <div className="flex items-center gap-1">
        {page > 1 ? (
          <Link href={href(page - 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50">
            ← ก่อนหน้า
          </Link>
        ) : (
          <span className="rounded-lg border border-slate-100 px-3 py-1.5 text-slate-300">← ก่อนหน้า</span>
        )}
        <span className="px-2 text-slate-500">หน้า {page}/{totalPages}</span>
        {page < totalPages ? (
          <Link href={href(page + 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50">
            ถัดไป →
          </Link>
        ) : (
          <span className="rounded-lg border border-slate-100 px-3 py-1.5 text-slate-300">ถัดไป →</span>
        )}
      </div>
    </div>
  );
}

/** อ่านเลขหน้าจาก searchParams อย่างปลอดภัย */
export function parsePage(v: string | undefined): number {
  const n = Math.floor(Number(v ?? "1"));
  return Number.isFinite(n) && n > 0 ? n : 1;
}
