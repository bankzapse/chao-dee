"use client";

import { useTransition } from "react";
import { togglePromo, deletePromo } from "./actions";

export function PromoButtons({ id, active }: { id: string; active: boolean }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => start(() => togglePromo(id, !active).then(() => {}))}
        disabled={pending}
        className="text-sm text-slate-500 hover:text-slate-800 disabled:opacity-50"
      >
        {active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
      </button>
      <button
        onClick={() => {
          if (confirm("ลบคูปองนี้?")) start(() => deletePromo(id).then(() => {}));
        }}
        disabled={pending}
        className="text-sm text-rose-500 hover:text-rose-700 disabled:opacity-50"
      >
        ลบ
      </button>
    </div>
  );
}
