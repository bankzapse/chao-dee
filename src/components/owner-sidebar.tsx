"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/owner", label: "ภาพรวม", icon: "📈", exact: true },
  { href: "/owner/members", label: "สมาชิก", icon: "👥" },
  { href: "/owner/payments", label: "การชำระเงิน", icon: "💳", badgeKey: "payments" },
  { href: "/owner/packages", label: "แพ็คเกจ", icon: "📦" },
  { href: "/owner/reports", label: "รายงาน", icon: "📊" },
];

export function OwnerSidebar({ pendingCount = 0 }: { pendingCount?: number }) {
  const pathname = usePathname();
  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-slate-900 text-slate-300 md:flex">
      <div className="flex items-center gap-3 border-b border-slate-800 px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400 font-bold text-white">
          ช
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">ChaoDee Console</p>
          <p className="text-xs text-slate-500">แผงเจ้าของระบบ</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {NAV.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.badgeKey === "payments" && pendingCount > 0 && (
                <span className="rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-slate-900">
                  {pendingCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 p-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800/50 hover:text-white"
        >
          ← กลับแอปจัดการหอพัก
        </Link>
      </div>
    </aside>
  );
}
