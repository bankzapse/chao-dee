"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generateInvoices } from "./actions";

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
