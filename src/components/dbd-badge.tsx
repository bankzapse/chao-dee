import { COMPANY } from "@/lib/company";

/**
 * เครื่องหมาย "จดทะเบียนพาณิชย์อิเล็กทรอนิกส์ (DBD Registered)"
 * - แสดงเลขทะเบียน + ลิงก์ตรวจสอบเมื่อมีการตั้งค่า NEXT_PUBLIC_DBD_REG_NO / _VERIFY_URL
 * - หากยังไม่มีเลข จะแสดงเครื่องหมายไว้ก่อน (เติมเลขภายหลังได้โดยไม่ต้องแก้โค้ด)
 * เมื่อได้เครื่องหมายภาพจาก DBD/trustmarkthai แล้ว สามารถแทน <svg> ด้วย <img> ของทางการได้
 */
export function DbdBadge({ className = "" }: { className?: string }) {
  const { dbdRegNo, dbdVerifyUrl } = COMPANY;

  const inner = (
    <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 2l7 3v6c0 4.4-3 8.3-7 9-4-0.7-7-4.6-7-9V5l7-3z"
          fill="#1e40af"
        />
        <path d="M8.5 12.2l2.3 2.3 4.7-4.7" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
      <span className="text-left leading-tight">
        <span className="block text-[11px] font-semibold text-slate-700">DBD Registered</span>
        <span className="block text-[10px] text-slate-400">
          จดทะเบียนพาณิชย์อิเล็กทรอนิกส์{dbdRegNo ? ` · ${dbdRegNo}` : ""}
        </span>
      </span>
    </span>
  );

  if (dbdVerifyUrl) {
    return (
      <a href={dbdVerifyUrl} target="_blank" rel="noreferrer" className={`inline-block hover:opacity-90 ${className}`}>
        {inner}
      </a>
    );
  }
  return <span className={`inline-block ${className}`}>{inner}</span>;
}
