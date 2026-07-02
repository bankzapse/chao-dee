"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generateLinkCode, unlinkLine } from "./actions";

export function LineLinkCell({
  tenantId,
  linked,
  code,
}: {
  tenantId: string;
  linked: boolean;
  code: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [shownCode, setShownCode] = useState(code);

  if (linked) {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
          🟢 เชื่อมแล้ว
        </span>
        <button
          className="text-xs text-slate-400 hover:text-rose-600"
          onClick={() =>
            startTransition(async () => {
              await unlinkLine(tenantId);
              router.refresh();
            })
          }
        >
          ยกเลิก
        </button>
      </div>
    );
  }

  if (shownCode) {
    return (
      <div className="flex items-center gap-2">
        <span className="rounded-md bg-indigo-50 px-2 py-1 font-mono text-sm font-semibold tracking-wider text-indigo-700">
          {shownCode}
        </span>
        <span className="text-xs text-slate-400">ให้ผู้เช่าพิมพ์รหัสนี้ใน LINE OA</span>
      </div>
    );
  }

  return (
    <button
      className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await generateLinkCode(tenantId);
          if (res.code) setShownCode(res.code);
          router.refresh();
        })
      }
    >
      {pending ? "…" : "สร้างรหัสเชื่อม LINE"}
    </button>
  );
}
