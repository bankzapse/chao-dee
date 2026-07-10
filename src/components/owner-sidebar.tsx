"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  group: "" | "chaodee" | "rent";
  exact?: boolean;
  perm?: string | null;
  badgeKey?: string;
  ownerOnly?: boolean;
};

const NAV: NavItem[] = [
  { href: "/owner", label: "ภาพรวม", icon: "📈", exact: true, perm: null, group: "" },
  { href: "/owner/members", label: "สมาชิก", icon: "👥", perm: "members", group: "chaodee" },
  { href: "/owner/payments", label: "การชำระค่าสมาชิก", icon: "💳", badgeKey: "payments", perm: "payments", group: "chaodee" },
  { href: "/owner/packages", label: "แพ็คเกจ", icon: "📦", perm: "packages", group: "chaodee" },
  { href: "/owner/promos", label: "คูปองส่วนลด", icon: "🎟️", perm: "promos", group: "chaodee" },
  { href: "/owner/reports", label: "รายงาน", icon: "📊", perm: "reports", group: "chaodee" },
  { href: "/owner/audit", label: "บันทึกกิจกรรม", icon: "📝", perm: "audit", group: "chaodee" },
  { href: "/owner/admins", label: "จัดการแอดมิน", icon: "🛡️", ownerOnly: true, group: "chaodee" },
  { href: "/owner/listings", label: "โปรโมทประกาศ", icon: "⭐", perm: "promotions", group: "rent" },
];

const GROUPS: { key: NavItem["group"]; label: string }[] = [
  { key: "", label: "" },
  { key: "chaodee", label: "Chao-Dee · จัดการหอ" },
  { key: "rent", label: "Chao-Dee Rent · marketplace" },
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
  const visible = NAV.filter((item) => {
    if (item.ownerOnly) return role === "owner";
    if (role === "owner" || !item.perm) return true;
    return perms.includes(item.perm);
  });

  const renderItem = (item: NavItem) => {
    const active = item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(item.href + "/");
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
          active ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
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
  };

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
        {GROUPS.map((g) => {
          const items = visible.filter((i) => i.group === g.key);
          if (items.length === 0) return null;
          return (
            <div key={g.key || "top"} className={g.label ? "pt-3" : ""}>
              {g.label && (
                <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                  {g.label}
                </p>
              )}
              {items.map(renderItem)}
            </div>
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
