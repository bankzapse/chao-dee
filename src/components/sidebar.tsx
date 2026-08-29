"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { LinkSpinner } from "@/components/nav";
import { canAccessModule, type Access } from "@/lib/permissions";

// module = key ใน permission catalog (ใช้ซ่อนเมนูตามสิทธิ์ทีมงาน) · ไม่มี module = แสดงเสมอ
const NAV = [
  { href: "/reports", label: "แดชบอร์ด / รายงาน", icon: "📊" },
  { href: "/buildings", label: "อาคาร", icon: "🏢", module: "buildings" },
  { href: "/rooms", label: "ห้องพัก", icon: "🚪", module: "rooms" },
  { href: "/floorplan", label: "ผังห้อง", icon: "🗺️", module: "rooms" },
  { href: "/tenants", label: "ผู้เช่า", icon: "👤", module: "tenants" },
  { href: "/contracts", label: "สัญญาเช่า", icon: "📄", module: "contracts" },
  { href: "/meters", label: "จดมิเตอร์", icon: "🔢", module: "meters" },
  { href: "/invoices", label: "บิล/ใบแจ้งหนี้", icon: "🧾", module: "invoices" },
  { href: "/listing", label: "ลงประกาศหาผู้เช่า", icon: "📣" },
  { href: "/announcements", label: "ประกาศ LINE", icon: "📢", module: "announcements" },
  { href: "/maintenance", label: "แจ้งซ่อม", icon: "🔧", module: "maintenance" },
  { href: "/parcels", label: "พัสดุ", icon: "📦", module: "parcels" },
  { href: "/fees", label: "ค่าจอดรถ/ค่าขยะ", icon: "🅿️", module: "fees" },
  { href: "/agency", label: "ดีลนายหน้า", icon: "🤝", module: "agency" },
  { href: "/expenses", label: "ค่าใช้จ่าย", icon: "💸", module: "expenses" },
  { href: "/team", label: "ทีมงาน", icon: "🧑‍🤝‍🧑", manageTeam: true },
  { href: "/renew", label: "ต่ออายุ/อัปเกรด", icon: "⭐" },
  { href: "/settings", label: "ตั้งค่าและการชำระเงิน", icon: "⚙️", module: "settings" },
  { href: "/help", label: "ช่วยเหลือ", icon: "❓" },
];

export function Sidebar({
  orgName,
  canManageTeam,
  access = null,
  openMaintenance = 0,
}: {
  orgName: string;
  canManageTeam?: boolean;
  access?: Access | null;
  openMaintenance?: number;
}) {
  const pathname = usePathname();
  // แอปจัดการหอแยกขาดจากแผงเจ้าของระบบ — เข้า /owner ได้ทาง /owner-login เท่านั้น
  // ซ่อนเมนู: ทีมงาน (manageTeam) เฉพาะเจ้าของ/แอดมิน · โมดูลอื่นตามสิทธิ์ (owner/admin เห็นครบ)
  const nav = NAV.filter((item) => {
    if ("manageTeam" in item && item.manageTeam && !canManageTeam) return false;
    if ("module" in item && item.module && !canAccessModule(access, item.module)) return false;
    return true;
  });

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
              data-tour={item.href.slice(1)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-indigo-500/15 text-white ring-1 ring-inset ring-indigo-400/20"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              <LinkSpinner />
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
