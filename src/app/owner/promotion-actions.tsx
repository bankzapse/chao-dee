"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/spinner";
import { approvePromotion, rejectPromotion } from "./actions";

export function ApprovePromotionButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() =>
        start(async () => {
          await approvePromotion(id);
          router.refresh();
        })
      }
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
    >
      {pending && <Spinner />}
      อนุมัติ
    </button>
  );
}

export function RejectPromotionButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() =>
        start(async () => {
          if (!confirm("ปฏิเสธคำขอโปรโมทนี้?")) return;
          await rejectPromotion(id);
          router.refresh();
        })
      }
      disabled={pending}
      className="rounded-lg px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-60"
    >
      ปฏิเสธ
    </button>
  );
}
