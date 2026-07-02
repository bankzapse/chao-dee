import type {
  RoomStatus,
  ContractStatus,
  InvoiceStatus,
  PaymentMethod,
  MaintenanceStatus,
  ParcelStatus,
  VehicleType,
} from "./types";

export function formatBaht(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatNumber(value: number | string | null | undefined): string {
  return new Intl.NumberFormat("th-TH").format(Number(value ?? 0));
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export const ROOM_STATUS_LABEL: Record<RoomStatus, string> = {
  vacant: "ว่าง",
  occupied: "มีผู้เช่า",
  reserved: "จองแล้ว",
  maintenance: "ปิดปรับปรุง",
};

export const ROOM_STATUS_STYLE: Record<RoomStatus, string> = {
  vacant: "bg-slate-100 text-slate-600",
  occupied: "bg-emerald-100 text-emerald-700",
  reserved: "bg-amber-100 text-amber-700",
  maintenance: "bg-rose-100 text-rose-700",
};

export const CONTRACT_STATUS_LABEL: Record<ContractStatus, string> = {
  active: "ใช้งานอยู่",
  ended: "สิ้นสุดแล้ว",
  terminated: "ยกเลิกก่อนกำหนด",
};

export const CONTRACT_STATUS_STYLE: Record<ContractStatus, string> = {
  active: "bg-emerald-100 text-emerald-700",
  ended: "bg-slate-100 text-slate-600",
  terminated: "bg-rose-100 text-rose-700",
};

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  unpaid: "ยังไม่ชำระ",
  partial: "ชำระบางส่วน",
  paid: "ชำระแล้ว",
  void: "ยกเลิก",
};

export const INVOICE_STATUS_STYLE: Record<InvoiceStatus, string> = {
  unpaid: "bg-rose-100 text-rose-700",
  partial: "bg-amber-100 text-amber-700",
  paid: "bg-emerald-100 text-emerald-700",
  void: "bg-slate-100 text-slate-500",
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "เงินสด",
  transfer: "โอนเงิน",
  promptpay: "พร้อมเพย์",
  other: "อื่นๆ",
};

export const MAINTENANCE_STATUS_LABEL: Record<MaintenanceStatus, string> = {
  open: "รอดำเนินการ",
  in_progress: "กำลังซ่อม",
  done: "เสร็จแล้ว",
  cancelled: "ยกเลิก",
};

export const MAINTENANCE_STATUS_STYLE: Record<MaintenanceStatus, string> = {
  open: "bg-rose-100 text-rose-700",
  in_progress: "bg-amber-100 text-amber-700",
  done: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-slate-100 text-slate-500",
};

export const PARCEL_STATUS_LABEL: Record<ParcelStatus, string> = {
  pending: "รอรับ",
  picked_up: "รับแล้ว",
};

export const PARCEL_STATUS_STYLE: Record<ParcelStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  picked_up: "bg-emerald-100 text-emerald-700",
};

export const VEHICLE_TYPE_LABEL: Record<VehicleType, string> = {
  car: "รถยนต์",
  motorcycle: "มอเตอร์ไซค์",
  other: "อื่นๆ",
};

/** 'YYYY-MM' → 'มิถุนายน 2569' */
export function formatPeriod(period: string): string {
  const [y, m] = period.split("-").map(Number);
  if (!y || !m) return period;
  return new Intl.DateTimeFormat("th-TH", { month: "long", year: "numeric" }).format(
    new Date(y, m - 1, 1)
  );
}

/** คืน 'YYYY-MM' ของเดือนปัจจุบัน */
export function currentPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** รายการ period ย้อนหลัง n เดือน (ล่าสุดก่อน) */
export function recentPeriods(n = 12): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = 0; i < n; i++) {
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    d.setMonth(d.getMonth() - 1);
  }
  return out;
}
