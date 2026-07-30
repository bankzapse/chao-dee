"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Gift } from "lucide-react";
import { seedDemoData } from "../demo-actions";

export function SeedDemoButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  return (
    <button
      className="btn-secondary"
      disabled={pending || done}
      onClick={() =>
        startTransition(async () => {
          await seedDemoData();
          setDone(true);
          router.refresh();
        })
      }
    >
      {pending ? (
        "กำลังโหลด…"
      ) : (
        <span className="inline-flex items-center gap-1.5">
          <Gift className="h-4 w-4" strokeWidth={2} /> โหลดข้อมูลตัวอย่าง
        </span>
      )}
    </button>
  );
}
