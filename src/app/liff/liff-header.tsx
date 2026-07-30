import Link from "next/link";

/** หัวหน้าย่อยใน LIFF พร้อมปุ่มกลับเมนูหลัก */
export function LiffHeader({ title }: { title: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <Link
        href="/liff"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm ring-1 ring-slate-100 active:scale-90"
        aria-label="กลับ"
      >
        ←
      </Link>
      <h1 className="text-lg font-bold text-slate-900">{title}</h1>
    </div>
  );
}
