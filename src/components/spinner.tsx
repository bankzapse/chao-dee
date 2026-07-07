/** สปินเนอร์หมุนๆ ใช้ระหว่างประมวลผล (สืบทอดสี currentColor) */
export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="กำลังโหลด"
      className={`inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent align-[-2px] ${className}`}
    />
  );
}
