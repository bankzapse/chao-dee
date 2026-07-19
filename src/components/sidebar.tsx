"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";

const NAV = [
  { href: "/reports", label: "แดชบอร์ด / รายงาน", icon: "📊" },
  { href: "/buildings", label: "อาคาร", icon: "🏢" },
  { href: "/rooms", label: "ห้องพัก", icon: "🚪" },
  { href: "/floorplan", label: "ผังห้อง", icon: "🗺️" },
  { href: "/tenants", label: "ผู้เช่า", icon: "👤" },
  { href: "/contracts", label: "สัญญาเช่า", icon: "📄" },
  { href: "/meters", label: "จดมิเตอร์", icon: "🔢" },
  { href: "/invoices", label: "บิล/ใบแจ้งหนี้", icon: "🧾" },
  { href: "/listing", label: "ลงประกาศหาผู้เช่า", icon: "📣" },
  { href: "/announcements", label: "ประกาศ LINE", icon: "📢" },
  { href: "/maintenance", label: "แจ้งซ่อม", icon: "🔧" },
  { href: "/parcels", label: "พัสดุ", icon: "📦" },
  { href: "/vehicles", label: "ยานพาหนะ", icon: "🚗" },
  { href: "/fees", label: "ค่าจอดรถ/ค่าขยะ", icon: "🅿️" },
  { href: "/expenses", label: "ค่าใช้จ่าย", icon: "💸" },
  { href: "/team", label: "ทีมงาน", icon: "🧑‍🤝‍🧑", manageTeam: true },
  { href: "/renew", label: "ต่ออายุ/อัปเกรด", icon: "⭐" },
  { href: "/settings", label: "ตั้งค่าและการชำระเงิน", icon: "⚙️" },
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
    <aside className="no-print hidden w-64 shrink-0 flex-col bg-slate-900 text-slate-300 md:flex">
      <div className="flex items-center gap-3 border-b border-slate-800 px-5 py-4">
        <span className="rounded-xl bg-white/95 p-1">
          <BrandMark size={30} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{orgName}</p>
          <p className="text-xs text-slate-500">Chao-Dee</p>
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
                  ? "bg-indigo-500/15 text-white ring-1 ring-inset ring-indigo-400/20"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
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
