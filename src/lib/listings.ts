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
  "เตียง",
  "ตู้เสื้อผ้า",
  "โต๊ะ-เก้าอี้",
  "โซฟา",
  "ตู้เย็น",
  "ทีวี",
  "เคเบิลทีวี",
  "เครื่องทำน้ำอุ่น",
  "Wi-Fi",
  "เครื่องซักผ้า",
  "ที่จอดรถยนต์",
  "ที่จอดมอเตอร์ไซค์",
  "ลิฟต์",
  "คีย์การ์ด",
  "กล้องวงจรปิด",
  "รปภ. 24 ชม.",
  "ร้านสะดวกซื้อ",
  "ร้านซัก-รีด",
  "สระว่ายน้ำ",
  "ฟิตเนส",
  "ใกล้รถไฟฟ้า",
];

export const GENDER_LABEL: Record<"any" | "male" | "female", string> = {
  any: "รับทุกเพศ",
  male: "ชายเท่านั้น",
  female: "หญิงเท่านั้น",
};

/** ป้ายค่าน้ำ เช่น "18 บาท/หน่วย" หรือ "50 บาท/คน/เดือน" */
export function waterLabel(rate: number, mode: "unit" | "person"): string {
  if (!rate || rate <= 0) return "";
  return mode === "person" ? `${formatBaht(rate)}/คน/เดือน` : `${formatBaht(rate)}/หน่วย`;
}

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

/**
 * ห้องว่าง/ราคาที่จะแสดง:
 *  - ผูกอาคาร → ห้องว่างดึงจาก rooms · ราคาใช้ค่ากรอกเอง (ช่วง) ถ้ามี ไม่งั้นดึงจาก rooms
 *  - standalone → ใช้ค่ากรอกเองทั้งหมด
 */
export function displayStat(
  l: {
    building_id: string | null;
    price_min: number;
    price_max: number;
    vacant_rooms: number;
  },
  byBuilding: Map<string, ListingStat>
): ListingStat {
  const manMin = Number(l.price_min) || 0;
  const manMax = Number(l.price_max) || 0;
  if (l.building_id) {
    const r = byBuilding.get(l.building_id) ?? { vacant: 0, minRent: 0, maxRent: 0 };
    const manVacant = Number(l.vacant_rooms) || 0;
    return {
      vacant: manVacant > 0 ? manVacant : r.vacant,
      minRent: manMin > 0 ? manMin : r.minRent,
      maxRent: manMax > 0 ? manMax : r.maxRent,
    };
  }
  return { vacant: Number(l.vacant_rooms) || 0, minRent: manMin, maxRent: manMax };
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
