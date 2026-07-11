"use client";

import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { QRCodeImg, lineOaUrl } from "@/components/qr-code";
import { saveLineOa } from "./line-oa-actions";

export function LineOaCard({ lineOaId }: { lineOaId: string }) {
  const url = lineOaUrl(lineOaId);
  return (
    <div className="card mb-6 p-5">
      <div className="flex items-center gap-2">
        <span className="text-lg">💚</span>
        <h2 className="font-semibold text-slate-900">LINE OA ของหอพัก (ให้ผู้เช่าสแกนเพิ่มเพื่อน)</h2>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        ใส่ LINE OA ไอดีของคุณ (เช่น @yourhome) ระบบจะสร้าง QR ให้พิมพ์ไปติดที่หอ ผู้เช่าสแกนเพื่อแอดได้เลย
      </p>

      <div className="mt-4 grid gap-5 sm:grid-cols-[1fr_auto] sm:items-start">
        <ActionForm action={saveLineOa} submitLabel="บันทึก LINE OA">
          <div>
            <label className="label">LINE OA ID</label>
            <input
              name="line_oa_id"
              className="field"
              defaultValue={lineOaId}
              placeholder="@yourhome"
            />
            <p className="mt-1 text-xs text-slate-400">
              ดูได้ที่ LINE Official Account Manager → ตั้งค่า → ข้อมูลบัญชี (Basic ID / พรีเมียมไอดี)
            </p>
          </div>
        </ActionForm>

        {url ? (
          <div className="flex flex-col items-center gap-2 rounded-xl bg-slate-50 p-4">
            <QRCodeImg text={url} size={160} />
            <p className="text-sm font-medium text-slate-700">{lineOaId}</p>
            <Link
              href="/settings/line-qr"
              target="_blank"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              🖨️ เปิดหน้าพิมพ์ QR
            </Link>
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-xl bg-slate-50 p-6 text-center text-xs text-slate-400 sm:w-48">
            ใส่ LINE OA ID แล้ว QR จะแสดงที่นี่
          </div>
        )}
      </div>
    </div>
  );
}
