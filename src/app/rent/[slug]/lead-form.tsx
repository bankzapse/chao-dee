"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { submitLead } from "../actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
    >
      {pending ? "กำลังส่ง…" : "ติดต่อผ่าน Chao-Dee รับส่วนลด"}
    </button>
  );
}

export function LeadForm({
  listingId,
  discountText,
}: {
  listingId: string;
  discountText: string;
}) {
  const [state, action] = useActionState(submitLead.bind(null, listingId), {} as {
    ok?: boolean;
    error?: string;
  });

  if (state?.ok) {
    return (
      <div className="rounded-xl bg-emerald-50 p-5 text-center">
        <p className="text-2xl">✅</p>
        <p className="mt-1 font-semibold text-emerald-700">ส่งข้อมูลเรียบร้อยแล้ว</p>
        <p className="mt-1 text-sm text-emerald-600">
          เจ้าของจะติดต่อกลับโดยเร็ว
          {discountText ? ` — แจ้งว่าติดต่อผ่าน Chao-Dee เพื่อรับส่วนลดเดือนแรก ${discountText}` : ""}
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-2.5">
      <input
        name="name"
        required
        placeholder="ชื่อของคุณ"
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm"
      />
      <input
        name="phone"
        required
        placeholder="เบอร์โทร / LINE"
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm"
      />
      <textarea
        name="message"
        rows={2}
        placeholder="ข้อความ (เช่น อยากเข้าอยู่เดือนไหน)"
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm"
      />
      {state?.error && <p className="text-sm text-rose-600">{state.error}</p>}
      <SubmitButton />
      <p className="text-center text-xs text-slate-400">
        การกดส่งถือว่าคุณยินยอมให้ Chao-Dee เก็บชื่อและเบอร์ติดต่อ เพื่อส่งให้เจ้าของที่พักติดต่อกลับ
        ตาม{" "}
        <a href="/privacy" target="_blank" className="underline hover:text-slate-600">
          นโยบายความเป็นส่วนตัว
        </a>
      </p>
    </form>
  );
}
