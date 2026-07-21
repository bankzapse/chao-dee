"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generateInvoices, recalcInvoices } from "./actions";

export function GenerateButton({ period }: { period: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState("");

  return (
    <div className="flex items-center gap-3">
      {msg && <span className="text-sm text-rose-600">{msg}</span>}
      <button
        className="btn-primary"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setMsg("");
            const res = await generateInvoices(period);
            if (res?.error) setMsg(res.error);
            else router.refresh();
          })
        }
      >
        {pending ? "กำลังออกบิล…" : "⚡ ออกบิลรอบนี้"}
      </button>
    </div>
  );
}

/**
 * คำนวณยอดบิลใหม่จากค่าปัจจุบัน (ค่าเช่า/น้ำ/ไฟ/จอดรถ/ขยะ)
 * ใช้เมื่อแก้ค่าบริการหลังออกบิลไปแล้ว — แตะเฉพาะบิลที่ยังค้างชำระ
 */
export function RecalcButton({ period }: { period: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok?: boolean; text: string } | null>(null);

  return (
    <div className="flex items-center gap-3">
      {msg && (
        <span className={`text-sm ${msg.ok ? "text-emerald-600" : "text-rose-600"}`}>{msg.text}</span>
      )}
      <button
        className="btn-secondary"
        disabled={pending}
        title="อัปเดตยอดบิลที่ยังค้างชำระ ให้ตรงกับค่าเช่า/ค่าน้ำ-ไฟ/ค่าจอดรถ/ค่าขยะ ล่าสุด"
        onClick={() =>
          startTransition(async () => {
            setMsg(null);
            if (
              !window.confirm(
                "คำนวณยอดบิลใหม่จากค่าปัจจุบัน?\n\n• แตะเฉพาะบิลที่ยัง “ค้างชำระ” เท่านั้น\n• บิลที่ชำระแล้ว/ชำระบางส่วน จะไม่ถูกแก้"
              )
            )
              return;
            const res = await recalcInvoices(period);
            if (res?.error) setMsg({ text: res.error });
            else {
              setMsg({ ok: true, text: "คำนวณยอดใหม่แล้ว" });
              router.refresh();
            }
          })
        }
      >
        {pending ? "กำลังคำนวณ…" : "🔄 คำนวณยอดใหม่"}
      </button>
    </div>
  );
}
