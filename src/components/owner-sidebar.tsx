"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";

const NAV = [
  { href: "/owner", label: "ภาพรวม", icon: "📈", exact: true, perm: null },
  { href: "/owner/members", label: "สมาชิก", icon: "👥", perm: "members" },
  { href: "/owner/payments", label: "การชำระเงิน", icon: "💳", badgeKey: "payments", perm: "payments" },
  { href: "/owner/listings", label: "โปรโมทประกาศ", icon: "⭐", perm: "promotions" },
  { href: "/owner/packages", label: "แพ็คเกจ", icon: "📦", perm: "packages" },
  { href: "/owner/promos", label: "คูปองส่วนลด", icon: "🎟️", perm: "promos" },
  { href: "/owner/reports", label: "รายงาน", icon: "📊", perm: "reports" },
  { href: "/owner/audit", label: "บันทึกกิจกรรม", icon: "📝", perm: "audit" },
  { href: "/owner/admins", label: "จัดการแอดมิน", icon: "🛡️", ownerOnly: true },
];

export function OwnerSidebar({
  pendingCount = 0,
  role = "owner",
  perms = [],
}: {
  pendingCount?: number;
  role?: "owner" | "admin";
  perms?: string[];
}) {
  const pathname = usePathname();
  const nav = NAV.filter((item) => {
    if (item.ownerOnly) return role === "owner";
    if (role === "owner" || !item.perm) return true;
    return perms.includes(item.perm);
  });
  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-slate-900 text-slate-300 md:flex">
      <div className="flex items-center gap-3 border-b border-slate-800 px-5 py-4">
        <BrandMark size={36} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">Chao-Dee Console</p>
          <p className="text-xs text-slate-500">แผงเจ้าของระบบ</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {nav.map((item) => {
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
