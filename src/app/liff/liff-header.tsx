import Link from "next/link";
import { ChevronLeft } from "lucide-react";

/** หัวหน้าย่อยใน LIFF พร้อมปุ่มกลับเมนูหลัก */
export function LiffHeader({ title }: { title: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <Link
        href="/liff"
        prefetch
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm ring-1 ring-slate-100 transition active:scale-90 active:bg-slate-100"
        aria-label="กลับเมนูหลัก"
      >
        <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
      </Link>
      <h1 className="text-lg font-bold text-slate-900">{title}</h1>
    </div>
  );
}
