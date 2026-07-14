/** อ่านค่าเงิน/ตัวเลขจากฟอร์มแบบปลอดภัย — ไม่ใช่ตัวเลข → fallback, ติดลบ → 0 */
export function money(v: FormDataEntryValue | null | undefined, fallback = 0): number {
  const n = Number(String(v ?? "").trim());
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, n);
}

/** จำนวนเต็ม >= min (ไม่ใช่ตัวเลข → min) */
export function intMin(v: FormDataEntryValue | null | undefined, min: number): number {
  const n = Math.floor(Number(String(v ?? "").trim()));
  if (!Number.isFinite(n)) return min;
  return Math.max(min, n);
}

/** จำนวนเต็มในช่วง [min, max] */
export function intClamp(v: FormDataEntryValue | null | undefined, min: number, max: number): number {
  return Math.min(max, intMin(v, min));
}
