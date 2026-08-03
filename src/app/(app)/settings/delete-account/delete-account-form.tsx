"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { deleteMyAccount, type DeleteState } from "./actions";

const CONFIRM_WORD = "ลบบัญชี";

function SubmitButton({ enabled }: { enabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || !enabled}
      className="w-full rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "กำลังลบบัญชี…" : "ลบบัญชีของฉันถาวร"}
    </button>
  );
}

export function DeleteAccountForm({ isSoloOwner }: { isSoloOwner: boolean }) {
  const [state, action] = useActionState<DeleteState, FormData>(deleteMyAccount, null);
  const [confirm, setConfirm] = useState("");
  const ready = confirm.trim() === CONFIRM_WORD;

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" strokeWidth={2} />
        <div>
          <h2 className="text-base font-semibold text-red-800">ลบบัญชีถาวร</h2>
          <p className="mt-1 text-sm text-red-700">
            การลบบัญชีจะลบข้อมูลส่วนตัวของคุณออกจากระบบอย่างถาวร และ<b>ย้อนกลับไม่ได้</b>
            {isSoloOwner ? (
              <>
                {" "}เนื่องจากคุณเป็นเจ้าของหอเพียงคนเดียว ระบบจะลบ<b>ข้อมูลกิจการทั้งหมด</b>
                {" "}(หอพัก ห้อง ผู้เช่า สัญญา บิล และเอกสารทั้งหมด) พร้อมกันด้วย
              </>
            ) : null}
          </p>
        </div>
      </div>

      <form action={action} className="mt-4 space-y-3">
        <label className="block text-sm text-red-800">
          พิมพ์คำว่า <b>“{CONFIRM_WORD}”</b> เพื่อยืนยัน
          <input
            name="confirm"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="off"
            className="mt-1 w-full rounded-xl border border-red-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500"
            placeholder={CONFIRM_WORD}
          />
        </label>
        {state?.error ? <p className="text-sm font-medium text-red-700">{state.error}</p> : null}
        <SubmitButton enabled={ready} />
      </form>
    </div>
  );
}
