"use client";

import { usePathname } from "next/navigation";
import { useRef, useEffect } from "react";

// ลำดับหน้า (ตาม tab bar) → ตัดสินทิศ slide แบบ iOS
// ไปหน้า index สูงกว่า = เข้าจากขวา (ลึกขึ้น) · ต่ำกว่า = เข้าจากซ้าย (ย้อนกลับ)
const ORDER = ["/liff/bills", "/liff/maintenance", "/liff/parcels", "/liff/room", "/liff/payment", "/liff/contact"];
function rank(path: string): number {
  if (path === "/liff") return 0;
  const i = ORDER.findIndex((p) => path === p || path.startsWith(p + "/"));
  return i >= 0 ? i + 1 : 99;
}

/**
 * ครอบเฉพาะ "เนื้อหาหน้า" ให้ slide เปลี่ยนหน้าแบบ iOS
 *
 * วางใน layout (mount ครั้งเดียว ไม่ remount) จึงเก็บหน้าก่อนหน้าไว้ใน useRef ได้เชื่อถือได้
 * และ re-render เฉพาะตอน "เปลี่ยนหน้าจริง" (pathname เปลี่ยน) — prefetch ของ tab อื่นไม่ trigger
 * key={path} ที่ div ด้านในทำให้ remount + เล่นอนิเมชันทุกครั้งที่เปลี่ยนหน้า
 */
export function SlideContainer({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const prevRank = useRef(0);
  const dir = rank(path) < prevRank.current ? "slide-left" : "slide-right";
  useEffect(() => {
    prevRank.current = rank(path);
  }, [path]);
  return (
    <div key={path} className={dir}>
      {children}
    </div>
  );
}
