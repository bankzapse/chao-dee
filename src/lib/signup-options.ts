// ตัวเลือกสำหรับฟอร์มสมัครสมาชิก

export const BUILDING_TYPES = [
  { value: "dorm", emoji: "🏠", label: "หอพัก/อพาร์ทเม้นท์", sub: "(เฉพาะรายเดือน)" },
  { value: "service", emoji: "🏢", label: "เซอร์วิส/อพาร์ทเม้นท์", sub: "(มีรายวัน+รายเดือน)" },
  { value: "hotel", emoji: "🏨", label: "โรงแรม", sub: "(เฉพาะรายวัน)" },
] as const;

export const ROOM_BUCKETS = ["1-20 ห้อง", "21-40 ห้อง", "41-80 ห้อง", "80 ห้องขึ้นไป"] as const;

export const PROPERTY_STATUS = [
  "เปิดให้บริการแล้ว",
  "กำลังก่อสร้าง",
  "กำลังปรับปรุง/รีโนเวท",
  "เปิดจองล่วงหน้า",
] as const;

export function buildingTypeLabel(value: string): string {
  return BUILDING_TYPES.find((b) => b.value === value)?.label ?? value;
}
