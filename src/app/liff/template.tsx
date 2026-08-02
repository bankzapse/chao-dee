"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// ลำดับหน้า (ตาม tab bar) → ใช้ตัดสินทิศ slide แบบ iOS
// ไปหน้า index สูงกว่า = เข้าใหม่จากขวา · ต่ำกว่า = เข้าจากซ้าย
const ORDER = ["/liff/bills", "/liff/maintenance", "/liff/parcels", "/liff/room", "/liff/payment", "/liff/contact"];
function rank(path: string): number {
  if (path === "/liff") return 0;
  const i = ORDER.findIndex((p) => path === p || path.startsWith(p + "/"));
  return i >= 0 ? i + 1 : 99; // หน้าที่ไม่อยู่ในลำดับ (link ฯลฯ) ถือว่าอยู่ลึกสุด
}

// เก็บ rank หน้าก่อนหน้าไว้ที่ระดับ module — คงอยู่ข้ามการเปลี่ยนหน้าฝั่ง client
let prevRank = 0;

// template.tsx สร้าง instance ใหม่ทุกครั้งที่เปลี่ยนหน้า → เนื้อหา slide เข้าทุกครั้ง
export default function LiffTemplate({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const cur = rank(path);
  const dir = cur < prevRank ? "slide-left" : "slide-right";

  // อัปเดต rank หลังเรนเดอร์ ให้ครั้งถัดไปเทียบทิศได้ถูก
  useEffect(() => {
    prevRank = cur;
  }, [cur]);

  return (
    <div key={path} className={dir}>
      {children}
    </div>
  );
}
