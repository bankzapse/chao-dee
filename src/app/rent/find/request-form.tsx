"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { submitHousingRequest } from "../actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-amber-400 px-5 py-3 text-sm font-semibold text-amber-950 transition hover:bg-amber-300 disabled:opacity-60"
    >
      {pending ? "กำลังส่ง…" : "ส่งคำขอ — ให้เราหาห้องให้ฟรี"}
    </button>
  );
}

export function RequestForm({ provinces }: { provinces: string[] }) {
  const [state, action] = useActionState(submitHousingRequest, {} as { ok?: boolean; error?: string });

  if (state?.ok) {
    return (
      <div className="rounded-2xl bg-emerald-50 p-8 text-center">
        <p className="text-3xl">✅</p>
        <p className="mt-2 text-lg font-semibold text-emerald-700">ส่งคำขอเรียบร้อยแล้ว</p>
        <p className="mt-1 text-sm text-emerald-600">
          ทีมงาน Chao-Dee จะติดต่อกลับโดยเร็ว พร้อมห้องที่ตรงกับที่คุณต้องการ
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">ชื่อของคุณ *</label>
          <input name="name" required className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">เบอร์โทร / LINE *</label>
          <input name="phone" required className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">จังหวัด</label>
          <select name="province" defaultValue="" className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm">
            <option value="">— เลือกจังหวัด —</option>
            {provinces.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">ย่าน / ใกล้อะไร</label>
          <input name="district" placeholder="เช่น ใกล้ ม.เชียงใหม่" className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">งบต่ำสุด (บาท)</label>
          <input name="budget_min" type="number" min="0" step="100" placeholder="3000" className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">งบสูงสุด (บาท)</label>
          <input name="budget_max" type="number" min="0" step="100" placeholder="5000" className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">จำนวนผู้พัก</label>
          <input name="occupants" type="number" min="1" defaultValue={1} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm" />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">อยากเข้าอยู่เมื่อไหร่</label>
        <input name="move_in" type="date" className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">รายละเอียดเพิ่มเติม</label>
        <textarea
          name="note"
          rows={3}
          placeholder="เช่น ต้องการห้องแอร์ มีที่จอดรถ เลี้ยงแมวได้"
          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
        />
      </div>

      {state?.error && <p className="text-sm text-rose-600">{state.error}</p>}
      <SubmitButton />
      <p className="text-center text-xs text-slate-400">
        การกดส่งถือว่าคุณยินยอมให้ Chao-Dee เก็บข้อมูลเพื่อติดต่อกลับและจัดหาห้องให้ ตาม{" "}
        <a href="/privacy" target="_blank" className="underline hover:text-slate-600">นโยบายความเป็นส่วนตัว</a>
      </p>
    </form>
  );
}
