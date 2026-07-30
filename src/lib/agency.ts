/** ระบบนายหน้าจัดหาผู้เช่า — ค่าคงที่/ตัวช่วย (client-safe) */

export const AGENCY_TERMS_VERSION = "v1.0";

/** ค่านายหน้ามาตรฐาน = ค่าเช่า 1 เดือน */
export const DEFAULT_COMMISSION_RATE = 1.0;

export type DealStatus =
  | "new"
  | "contacted"
  | "viewing"
  | "signed"
  | "invoiced"
  | "paid"
  | "cancelled";

export const DEAL_STATUS_LABEL: Record<DealStatus, string> = {
  new: "ใหม่",
  contacted: "ติดต่อแล้ว",
  viewing: "นัดดูห้อง",
  signed: "เซ็นสัญญาแล้ว",
  invoiced: "วางบิลแล้ว",
  paid: "ชำระแล้ว",
  cancelled: "ยกเลิก",
};

export const DEAL_STATUS_STYLE: Record<DealStatus, string> = {
  new: "bg-slate-100 text-slate-700",
  contacted: "bg-sky-100 text-sky-700",
  viewing: "bg-indigo-100 text-indigo-700",
  signed: "bg-violet-100 text-violet-700",
  invoiced: "bg-amber-100 text-amber-700",
  paid: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-700",
};

/** ลำดับ pipeline (ใช้จัดเรียง/แสดงขั้นถัดไป) */
export const DEAL_FLOW: DealStatus[] = ["new", "contacted", "viewing", "signed", "invoiced", "paid"];

/** ขั้นถัดไปของ pipeline (null = จบแล้ว) */
export function nextStatus(s: DealStatus): DealStatus | null {
  const i = DEAL_FLOW.indexOf(s);
  if (i < 0 || i >= DEAL_FLOW.length - 1) return null;
  return DEAL_FLOW[i + 1];
}

/** คำนวณค่านายหน้าจากค่าเช่า/เดือน (ปัดเป็นทศนิยม 2 ตำแหน่ง) */
export function commissionOf(rentBase: number, rate = DEFAULT_COMMISSION_RATE): number {
  const n = Number(rentBase) * Number(rate);
  return Number.isFinite(n) ? Math.round(Math.max(0, n) * 100) / 100 : 0;
}

/** อัตราภาษีหัก ณ ที่จ่ายค่าบริการ (ผู้จ่ายเป็นนิติบุคคลต้องหัก) */
export const WHT_RATE = 3;

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * แยกยอดค่านายหน้าเป็นภาษี (มาตรฐานไทย)
 *  - ฐาน (base) = ค่านายหน้าก่อน VAT
 *  - VAT 7% บวกเพิ่มเมื่อผู้ให้บริการจด VAT
 *  - หัก ณ ที่จ่าย 3% ของ "ฐาน" เมื่อผู้จ่ายเป็นนิติบุคคล (หักจากยอดรวมตอนโอน)
 *  - net = ยอดโอนจริง = รวม(รวม VAT) − หัก ณ ที่จ่าย
 */
export function commissionBreakdown(
  base: number,
  opts: { vatRegistered: boolean; vatRate?: number; isJuristic: boolean }
) {
  const b = Math.max(0, round2(base));
  const vat = opts.vatRegistered ? round2((b * (opts.vatRate ?? 7)) / 100) : 0;
  const total = round2(b + vat);
  const wht = opts.isJuristic ? round2((b * WHT_RATE) / 100) : 0;
  const net = round2(total - wht);
  return { base: b, vat, total, wht, net };
}
