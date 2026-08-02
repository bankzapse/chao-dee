import { redirect } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { getLiffTenant } from "@/lib/liff";
import { CloseLiffButton } from "./close-button";

/**
 * หน้า "ผูกบัญชี" — ให้ผู้เช่าผูกผ่านแชท (พิมพ์เบอร์ในแชท Chao-Dee)
 *
 * ทำไมใช้แชทไม่ใช่ฟอร์มใน LIFF: iOS/LINE webview บางเครื่องไม่เก็บคุกกี้ session ที่
 * ตั้งผ่าน LIFF ทำให้ฟอร์มผูกในหน้านี้ทำงานไม่ได้/วน loop — การพิมพ์เบอร์ในแชท (webhook)
 * ไม่พึ่งคุกกี้จึงเสถียร 100% ทุกเครื่อง
 */
export default async function LiffLinkPage() {
  // ถ้าคุกกี้ session ทำงาน + ผูกแล้ว → เข้าเมนูเลย
  const tenant = await getLiffTenant();
  if (tenant) redirect("/liff");

  return (
    <div className="pt-6">
      <div className="mx-auto max-w-sm rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-100">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500">
          <MessageCircle className="h-7 w-7" strokeWidth={2} />
        </div>
        <h1 className="mt-3 text-lg font-bold text-slate-900">ผูกบัญชีก่อนใช้งาน</h1>
        <p className="mt-1 text-sm text-slate-500">
          เพื่อดูบิล / แจ้งซ่อม / พัสดุ กรุณาผูกบัญชีโดย
          <b className="text-slate-700"> พิมพ์เบอร์โทรของคุณในแชท Chao-Dee</b>
        </p>

        <ol className="mt-4 space-y-2.5 text-left text-sm text-slate-600">
          <li className="flex gap-2">
            <span className="font-bold text-indigo-600">1.</span> ปิดหน้านี้ กลับไปที่แชท Chao-Dee
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-indigo-600">2.</span> พิมพ์เบอร์โทรของคุณ เช่น{" "}
            <span className="rounded bg-slate-100 px-1.5 font-mono text-slate-700">0812345678</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-indigo-600">3.</span> ระบบตอบ “เชื่อมบัญชีสำเร็จ ✅” แล้วกดเมนู “หน้าแรก” เข้าใช้งานได้เลย
          </li>
        </ol>

        <div className="mt-5">
          <CloseLiffButton />
        </div>
      </div>
      <p className="mt-4 text-center text-xs text-slate-400">
        ถ้าเบอร์ไม่ตรงหรือผูกไม่ได้ กรุณาให้ผู้ดูแลหอเพิ่ม/แก้เบอร์ให้ก่อน
      </p>
    </div>
  );
}
