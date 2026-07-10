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
