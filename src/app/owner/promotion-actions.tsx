"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ModalButton } from "@/components/modal";
import { ActionForm } from "@/components/action-form";
import { Spinner } from "@/components/spinner";
import { approvePromotion, rejectPromotion, updatePromoPrice } from "./actions";

export function EditPromoPriceButton({
  days,
  label,
  price,
}: {
  days: number;
  label: string;
  price: number;
}) {
  return (
    <ModalButton label="แก้ราคา" title={`แก้ราคาโปรโมท ${label}`} variant="secondary">
      {(close) => (
        <ActionForm
          action={updatePromoPrice.bind(null, days)}
          onSuccess={close}
          submitLabel="บันทึกราคา"
        >
          <div>
            <label className="label">ราคา (บาท) ต่อ {label}</label>
            <input
              name="price"
              type="number"
              step="1"
              min={0}
              className="field"
              defaultValue={price}
              required
            />
          </div>
          <p className="text-xs text-slate-400">
            ราคานี้จะมีผลทันทีกับหน้าซื้อโปรโมทของเจ้าของหอทุกราย
          </p>
        </ActionForm>
      )}
    </ModalButton>
  );
}

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
