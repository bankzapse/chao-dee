"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/spinner";
import { issueTaxInvoice } from "../actions";

export function IssueTaxInvoiceButton({ paymentId, disabled }: { paymentId: string; disabled?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
      disabled={pending || disabled}
      onClick={() =>
        start(async () => {
          if (!window.confirm("ออกเลขที่ใบกำกับภาษีให้การชำระนี้? (ออกแล้วแก้ไข/ยกเลิกไม่ได้)")) return;
          const res = await issueTaxInvoice(paymentId);
          if (res && !res.ok && res.error) window.alert(res.error);
          router.refresh();
        })
      }
    >
      {pending && <Spinner className="!h-3.5 !w-3.5" />}
      {pending ? "กำลังออก…" : "ออกใบกำกับภาษี"}
    </button>
  );
}
