"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/** กันแถบค้างถ้า navigation ถูกยกเลิก/ล้มเหลว */
const SAFETY_MS = 15000;

/**
 * แถบโหลดบนสุดของจอ — ขึ้นทันทีที่กดลิงก์ใดๆ ในเว็บ แล้วหายเมื่อหน้าใหม่มาถึง
 *
 * ทำไมต้องดักคลิกเอง: App Router ไม่มี router events ให้ subscribe และ loading.tsx
 * จะโชว์ก็ต่อเมื่อเปลี่ยน route segment เท่านั้น — การกดชิปกรอง/เปลี่ยนรอบเดือน
 * ที่เปลี่ยนแค่ query string จึงเงียบสนิท ผู้ใช้ไม่รู้ว่าระบบทำงานอยู่
 */
export function NavProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);

  // URL เปลี่ยนแล้ว = โหลดเสร็จ
  useEffect(() => {
    setActive(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      // ปล่อยผ่านคลิกที่เบราว์เซอร์จัดการเอง (เปิดแท็บใหม่ / คลิกขวา / ถูก preventDefault ไปแล้ว)
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const a = (e.target as HTMLElement | null)?.closest?.("a");
      if (!a) return;
      const href = a.getAttribute("href");
      // เฉพาะลิงก์ภายในเว็บ — ข้าม tel:, mailto:, ลิงก์นอก, เปิดแท็บใหม่, ดาวน์โหลด
      if (!href || !href.startsWith("/")) return;
      if (a.target === "_blank" || a.hasAttribute("download")) return;

      const url = new URL(href, location.origin);
      // กดลิงก์ที่อยู่หน้าเดิม → ไม่มีอะไรโหลด
      if (url.pathname + url.search === location.pathname + location.search) return;
      setActive(true);
    }
    // capture เพื่อให้ทันก่อน Link ของ Next จะ preventDefault
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => setActive(false), SAFETY_MS);
    return () => clearTimeout(t);
  }, [active]);

  if (!active) return null;

  return (
    <div
      role="status"
      aria-label="กำลังโหลด"
      className="no-print pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden bg-indigo-100"
    >
      <div className="chao-navbar h-full w-1/3 bg-gradient-to-r from-indigo-500 to-violet-500" />
    </div>
  );
}
