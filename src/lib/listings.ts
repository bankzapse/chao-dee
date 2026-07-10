import type { PropertyType, DiscountType, LeadStatus } from "@/lib/types";
import { formatBaht } from "@/lib/format";

export const PROPERTY_TYPE_LABEL: Record<PropertyType, string> = {
  dorm: "หอพัก",
  condo: "คอนโด",
  apartment: "อพาร์ตเมนต์",
};

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  new: "ใหม่",
  contacted: "ติดต่อแล้ว",
  moved_in: "เข้าพักแล้ว",
  lost: "ไม่สำเร็จ",
};

export const LEAD_STATUS_STYLE: Record<LeadStatus, string> = {
  new: "bg-indigo-100 text-indigo-700",
  contacted: "bg-amber-100 text-amber-700",
  moved_in: "bg-emerald-100 text-emerald-700",
  lost: "bg-slate-100 text-slate-500",
};

/** รายการสิ่งอำนวยความสะดวกให้ติ๊กเลือก */
export const AMENITIES = [
  "แอร์",
  "เฟอร์นิเจอร์",
  "ที่จอดรถ",
  "Wi-Fi",
  "เครื่องซักผ้า",
  "ลิฟต์",
  "กล้องวงจรปิด",
  "รปภ. 24 ชม.",
  "สระว่ายน้ำ",
  "ฟิตเนส",
  "ตู้เย็น",
  "เครื่องทำน้ำอุ่น",
  "สัตว์เลี้ยงได้",
  "ใกล้รถไฟฟ้า",
];

/** ป้ายส่วนลดเดือนแรก เช่น "50%" หรือ "฿1,000" (คืน "" ถ้าไม่มีส่วนลด) */
export function discountLabel(type: DiscountType, value: number): string {
  if (!value || value <= 0) return "";
  return type === "percent" ? `${value}%` : formatBaht(value);
}

export type ListingStat = { vacant: number; minRent: number; maxRent: number };

/** สถิติห้องว่าง/ราคา ต่ออาคาร (จาก rooms) — ใช้กับประกาศที่ผูกอาคาร */
export function roomStatByBuilding(
  rooms: { building_id: string; status: string; base_rent: number }[]
): Map<string, ListingStat> {
  const map = new Map<string, ListingStat>();
  rooms.forEach((r) => {
    const s = map.get(r.building_id) ?? { vacant: 0, minRent: 0, maxRent: 0 };
    if (r.status === "vacant") s.vacant += 1;
    const rent = Number(r.base_rent);
    if (rent > 0) {
      if (s.minRent === 0 || rent < s.minRent) s.minRent = rent;
      if (rent > s.maxRent) s.maxRent = rent;
    }
    map.set(r.building_id, s);
  });
  return map;
}

/** ห้องว่าง/ราคาที่จะแสดง: ผูกอาคาร→ดึงจาก rooms · standalone→ใช้ค่ากรอกเอง */
export function displayStat(
  l: {
    building_id: string | null;
    price_min: number;
    price_max: number;
    vacant_rooms: number;
  },
  byBuilding: Map<string, ListingStat>
): ListingStat {
  if (l.building_id) {
    return byBuilding.get(l.building_id) ?? { vacant: 0, minRent: 0, maxRent: 0 };
  }
  return {
    vacant: Number(l.vacant_rooms) || 0,
    minRent: Number(l.price_min) || 0,
    maxRent: Number(l.price_max) || 0,
  };
}

/** สร้าง slug จากชื่อ + ท้าย id กันชนกัน */
export function makeSlug(title: string, id: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const suffix = id.slice(0, 6);
  return base ? `${base}-${suffix}` : suffix;
}
