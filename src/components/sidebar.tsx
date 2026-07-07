"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";

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
  { href: "/team", label: "ทีมงาน", icon: "🧑‍🤝‍🧑", manageTeam: true },
  { href: "/renew", label: "ต่ออายุ/อัปเกรด", icon: "⭐" },
  { href: "/settings", label: "ตั้งค่า", icon: "⚙️" },
  { href: "/help", label: "ช่วยเหลือ", icon: "❓" },
];

export function Sidebar({
  orgName,
  canManageTeam,
  openMaintenance = 0,
}: {
  orgName: string;
  canManageTeam?: boolean;
  openMaintenance?: number;
}) {
  const pathname = usePathname();
  // แอปจัดการหอแยกขาดจากแผงเจ้าของระบบ — เข้า /owner ได้ทาง /owner-login เท่านั้น
  const nav = NAV.filter((item) => !("manageTeam" in item) || canManageTeam);

  return (
    <aside className="no-print hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
      <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
        <BrandMark size={36} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{orgName}</p>
          <p className="text-xs text-slate-400">Chao-Dee</p>
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
              <span className="flex-1">{item.label}</span>
              {item.href === "/maintenance" && openMaintenance > 0 && (
                <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-xs font-bold text-white">
                  {openMaintenance}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
