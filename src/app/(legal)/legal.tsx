import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/brand-mark";

/** เลย์เอาต์ร่วมสำหรับหน้าเอกสารทางกฎหมาย */
export function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200 px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <BrandMark size={32} />
            <span className="font-bold text-slate-900">Chao-Dee</span>
          </Link>
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">
            ← กลับหน้าแรก
          </Link>
        </div>
      </header>
      <article className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-400">ปรับปรุงล่าสุด {updated}</p>
        <div className="prose-legal mt-8 space-y-6 text-slate-700">{children}</div>
        <div className="mt-12 border-t border-slate-100 pt-6 text-sm text-slate-400">
          <Link href="/privacy" className="hover:text-slate-600">
            นโยบายความเป็นส่วนตัว
          </Link>
          {" · "}
          <Link href="/terms" className="hover:text-slate-600">
            ข้อกำหนดการใช้งาน
          </Link>
        </div>
      </article>
    </div>
  );
}

export function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-slate-900">{heading}</h2>
      <div className="mt-2 space-y-2 text-[15px] leading-relaxed text-slate-600">{children}</div>
    </section>
  );
}
