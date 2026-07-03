"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/**
 * ปุ่มมุมขวาบนของหน้าแรก — เช็ค session ฝั่ง client เพื่อคงหน้าแรกให้ static (เร็ว/SEO ดี)
 * ล็อกอินอยู่ → ปุ่ม "ไปแดชบอร์ด" · ยังไม่ล็อกอิน → เข้าสู่ระบบ + เริ่มใช้ฟรี
 */
export function HeaderCta() {
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => setAuthed(Boolean(data.session)));
  }, []);

  if (authed) {
    return (
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          ไปแดชบอร์ด →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
        เข้าสู่ระบบ
      </Link>
      <Link
        href="/signup"
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
      >
        เริ่มใช้ฟรี
      </Link>
    </div>
  );
}
