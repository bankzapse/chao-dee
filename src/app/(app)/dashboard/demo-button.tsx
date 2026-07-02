"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
      {pending ? "กำลังโหลด…" : "🎁 โหลดข้อมูลตัวอย่าง"}
    </button>
  );
}
