"use client";

import { useActionState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";

export type FormState = { ok?: boolean; error?: string } | null;

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "กำลังบันทึก…" : label}
    </button>
  );
}

export function ActionForm({
  action,
  onSuccess,
  submitLabel = "บันทึก",
  children,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  onSuccess?: () => void;
  submitLabel?: string;
  children: React.ReactNode;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, null);
  const router = useRouter();

  useEffect(() => {
    if (state?.ok) {
      onSuccess?.();
      router.refresh();
    }
  }, [state, onSuccess, router]);

  return (
    <form action={formAction} className="space-y-4">
      {children}
      {state?.error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {state.error}
        </p>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}

/** ปุ่มลบพร้อมยืนยัน — ใช้กับ server action ที่รับ id */
export function DeleteButton({
  action,
  confirmText = "ยืนยันการลบรายการนี้?",
  label = "ลบ",
}: {
  action: () => Promise<void>;
  confirmText?: string;
  label?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      className="text-sm font-medium text-rose-600 hover:text-rose-700 disabled:opacity-50"
      disabled={pending}
      onClick={() => {
        if (!confirm(confirmText)) return;
        start(async () => {
          await action();
          router.refresh();
        });
      }}
    >
      {pending ? "กำลังลบ…" : label}
    </button>
  );
}
