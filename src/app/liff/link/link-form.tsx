"use client";

import { useState } from "react";

/** ผูกบัญชีด้วยเบอร์โทรที่ลงทะเบียนไว้กับหอ */
export function LinkForm() {
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    setErr("");
    setBusy(true);
    try {
      const res = await fetch("/api/liff/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErr(json.error ?? "ผูกบัญชีไม่สำเร็จ");
        return;
      }
      // hard navigation: โหลด /liff ใหม่ทั้งหน้าเพื่อให้อ่าน cookie ที่เพิ่งผูก (เซสชันมี tenantId แล้ว)
      // เลี่ยง Router Cache ของ Next.js ที่ยัง cache หน้า /liff ตอน "ยังไม่ผูก" ไว้ → เด้งกลับหน้าผูกวน
      window.location.replace("/liff");
    } catch {
      setErr("เชื่อมต่อไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <input
        type="tel"
        inputMode="numeric"
        maxLength={10}
        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-lg tracking-wide outline-none focus:border-indigo-500"
        placeholder="08X-XXX-XXXX"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      {err && <p className="text-sm text-rose-600">{err}</p>}
      <button
        onClick={submit}
        disabled={busy}
        className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white active:scale-95 disabled:opacity-50"
      >
        {busy ? "กำลังผูกบัญชี…" : "ผูกบัญชี"}
      </button>
    </div>
  );
}
