"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui";
import { generateOrgLineCode, unlinkOrgLine } from "./line-actions";

export function LineOwnerCard({
  linked,
  code,
}: {
  linked: boolean;
  code: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [shownCode, setShownCode] = useState(code);

  function onGenerate() {
    start(async () => {
      const res = await generateOrgLineCode();
      if (res.code) setShownCode(res.code);
      router.refresh();
    });
  }
  function onUnlink() {
    if (!confirm("ยกเลิกการเชื่อม LINE เจ้าของหอ?")) return;
    start(async () => {
      await unlinkOrgLine();
      setShownCode("");
      router.refresh();
    });
  }

  return (
    <div className="card mb-6 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-slate-900">แจ้งเตือนผ่าน LINE (เจ้าของหอ)</h2>
            {linked ? (
              <Badge className="bg-emerald-100 text-emerald-700">🟢 เชื่อมแล้ว</Badge>
            ) : (
              <Badge className="bg-slate-100 text-slate-500">ยังไม่เชื่อม</Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            เชื่อม LINE ของคุณกับ ChaoDee OA เพื่อรับแจ้งเตือนทันทีเมื่อผู้เช่าแจ้งซ่อม
          </p>
        </div>
        {linked ? (
          <button onClick={onUnlink} disabled={pending} className="btn-secondary">
            ยกเลิกการเชื่อม
          </button>
        ) : (
          <button onClick={onGenerate} disabled={pending} className="btn-primary">
            {pending ? "กำลังสร้าง…" : shownCode ? "สร้างรหัสใหม่" : "สร้างรหัสเชื่อม"}
          </button>
        )}
      </div>

      {!linked && shownCode && (
        <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50 p-4">
          <p className="text-sm text-slate-600">
            1) แอด <b>ChaoDee OA</b> เป็นเพื่อน แล้วส่งรหัสนี้เข้าแชต:
          </p>
          <p className="mt-2 text-center text-3xl font-bold tracking-[0.3em] text-indigo-700">
            {shownCode}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            2) เมื่อผูกสำเร็จ จะได้รับแจ้งเตือนแจ้งซ่อมใหม่ทาง LINE ทันที
          </p>
        </div>
      )}
    </div>
  );
}
