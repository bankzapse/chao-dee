"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ReceiptText, Wrench, Package, DoorOpen, type LucideIcon } from "lucide-react";

const TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/liff", label: "หน้าแรก", icon: Home },
  { href: "/liff/bills", label: "บิล", icon: ReceiptText },
  { href: "/liff/maintenance", label: "แจ้งซ่อม", icon: Wrench },
  { href: "/liff/parcels", label: "พัสดุ", icon: Package },
  { href: "/liff/room", label: "ห้อง", icon: DoorOpen },
];

const isActive = (path: string, href: string) =>
  href === "/liff" ? path === "/liff" : path === href || path.startsWith(href + "/");

/** แถบเมนูล่างแบบแอป — ค้างอยู่ล่างเสมอ (ซ่อนในหน้าผูกบัญชี) */
export function LiffTabBar() {
  const path = usePathname();
  if (path.startsWith("/liff/link")) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-md items-stretch">
        {TABS.map((t) => {
          const on = isActive(path, t.href);
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              prefetch
              aria-current={on ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 transition active:scale-90 ${
                on ? "text-indigo-600" : "text-slate-400"
              }`}
            >
              <Icon className="h-6 w-6" strokeWidth={on ? 2.4 : 2} />
              <span className={`text-[11px] leading-none ${on ? "font-semibold" : "font-medium"}`}>
                {t.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
