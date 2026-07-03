"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "แดชบอร์ด", icon: "📊" },
  { href: "/reports", label: "รายงาน", icon: "📈" },
  { href: "/buildings", label: "อาคาร", icon: "🏢" },
  { href: "/rooms", label: "ห้องพัก", icon: "🚪" },
  { href: "/floorplan", label: "ผังห้อง", icon: "🗺️" },
  { href: "/tenants", label: "ผู้เช่า", icon: "👤" },
  { href: "/contracts", label: "สัญญาเช่า", icon: "📄" },
  { href: "/meters", label: "จดมิเตอร์", icon: "🔢" },
  { href: "/invoices", label: "บิล/ใบแจ้งหนี้", icon: "🧾" },
  { href: "/announcements", label: "ประกาศ LINE", icon: "📢" },
  { href: "/maintenance", label: "แจ้งซ่อม", icon: "🔧" },
  { href: "/parcels", label: "พัสดุ", icon: "📦" },
  { href: "/vehicles", label: "ยานพาหนะ", icon: "🚗" },
  { href: "/expenses", label: "ค่าใช้จ่าย", icon: "💸" },
  { href: "/settings", label: "ตั้งค่า", icon: "⚙️" },
  { href: "/help", label: "ช่วยเหลือ", icon: "❓" },
];

export function Sidebar({
  orgName,
  isPlatformAdmin,
}: {
  orgName: string;
  isPlatformAdmin?: boolean;
}) {
  const pathname = usePathname();
  const nav = isPlatformAdmin
    ? [...NAV, { href: "/owner", label: "แผงเจ้าของระบบ", icon: "👑" }]
    : NAV;

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
      <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white">
          ช
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{orgName}</p>
          <p className="text-xs text-slate-400">ChaoDee</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {nav.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
