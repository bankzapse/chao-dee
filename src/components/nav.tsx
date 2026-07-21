"use client";

import Link, { useLinkStatus } from "next/link";
import { Spinner } from "./spinner";

/**
 * สปินเนอร์ที่รู้ว่า <Link> แม่ของมันกำลังโหลดหน้าอยู่หรือไม่
 * ต้องอยู่ "ข้างใน" <Link> เท่านั้น (useLinkStatus อ่านสถานะจาก Link ที่ครอบอยู่)
 *
 * มีไว้เพราะการกดลิงก์/ชิปกรอง ไม่ใช่ปุ่ม จึงไม่มี useFormStatus/useTransition
 * มาบอกว่ากำลังโหลด — เดิมกดแล้วหน้าค้างเฉยๆ ไม่รู้ว่าระบบทำงานอยู่ไหม
 */
export function LinkSpinner({ className = "" }: { className?: string }) {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <Spinner className={`!h-3.5 !w-3.5 ${className}`} />;
}

/** ลิงก์ที่ขึ้นสปินเนอร์ต่อท้ายระหว่างโหลดหน้าใหม่ */
export function PendingLink({
  href,
  className = "",
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={`inline-flex items-center gap-1.5 ${className}`}>
      {children}
      <LinkSpinner />
    </Link>
  );
}

/** ชิปกรอง (เลือกอาคาร ฯลฯ) — ขึ้นสปินเนอร์ในชิปที่กดระหว่างโหลด */
export function FilterChip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition ${
        active
          ? "bg-indigo-600 text-white"
          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {label}
      <LinkSpinner />
    </Link>
  );
}
