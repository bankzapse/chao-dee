"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Spinner } from "@/components/spinner";

export type FormState = {
  ok?: boolean;
  error?: string;
  /** ค่าที่กรอก ส่งกลับเมื่อ error เพื่อคงข้อมูลในฟอร์ม (แก้เฉพาะจุดที่ผิด) */
  values?: Record<string, unknown>;
} | null;

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary inline-flex items-center gap-2" disabled={pending}>
      {pending && <Spinner />}
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
  /** children ปกติ หรือ ฟังก์ชันรับ state เพื่ออ่านค่าที่กรอก (values) มาคงไว้ในฟอร์ม */
  children: React.ReactNode | ((state: FormState) => React.ReactNode);
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, null);
  const router = useRouter();
  // นับรอบ submit — ใช้ remount ฟิลด์เพื่อคงค่าที่กรอก (React 19 รีเซ็ตฟอร์มหลัง action)
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (state?.ok) {
      onSuccess?.();
      router.refresh();
    } else if (state) {
      setNonce((n) => n + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const content = typeof children === "function" ? children(state) : children;

  return (
    <form action={formAction} className="space-y-4">
      <div key={nonce} className="space-y-4">
        {content}
      </div>
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

/**
 * ปุ่มลบพร้อมยืนยัน — ใช้กับ server action ที่รับ id
 *
 * action คืน { error } ได้ เพื่อบอกว่าลบไม่สำเร็จ (เช่น ไม่มีสิทธิ์ / ติด FK)
 * เดิม action คืน void เฉยๆ ลบไม่สำเร็จก็เงียบ ผู้ใช้เห็นแถวยังอยู่แต่ไม่รู้ว่าทำไม
 */
export function DeleteButton({
  action,
  confirmText = "ยืนยันการลบรายการนี้?",
  label = "ลบ",
}: {
  action: () => Promise<void | FormState>;
  confirmText?: string;
  label?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState("");
  return (
    <span className="inline-flex items-center gap-2">
      {err && <span className="text-xs text-rose-600">{err}</span>}
      <button
        className="inline-flex items-center gap-1.5 text-sm font-medium text-rose-600 hover:text-rose-700 disabled:opacity-50"
        disabled={pending}
        onClick={() => {
          if (!confirm(confirmText)) return;
          setErr("");
          start(async () => {
            try {
              const res = await action();
              if (res?.error) {
                setErr(res.error);
                return;
              }
            } catch {
              setErr("ลบไม่สำเร็จ ลองใหม่อีกครั้ง");
              return;
            }
            router.refresh();
          });
        }}
      >
        {pending && <Spinner className="!h-3.5 !w-3.5" />}
        {pending ? "กำลังลบ…" : label}
      </button>
    </span>
  );
}
