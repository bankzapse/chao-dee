"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ModalButton } from "@/components/modal";
import { ActionForm } from "@/components/action-form";
import { createAnnouncement, sendAnnouncement } from "./actions";

export function AddAnnouncementButton() {
  return (
    <ModalButton label="+ เขียนประกาศ" title="เขียนประกาศใหม่">
      {(close) => (
        <ActionForm action={createAnnouncement} onSuccess={close} submitLabel="บันทึกร่าง">
          <div>
            <label className="label">หัวข้อ *</label>
            <input name="title" className="field" placeholder="แจ้งกำหนดชำระค่าเช่า" required />
          </div>
          <div>
            <label className="label">เนื้อหา</label>
            <textarea
              name="body"
              className="field"
              rows={4}
              placeholder="เรียนผู้เช่าทุกท่าน กรุณาชำระค่าเช่าภายในวันที่ 5 ของเดือน…"
            />
          </div>
        </ActionForm>
      )}
    </ModalButton>
  );
}

export function SendAnnouncementButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState("");

  return (
    <div className="flex items-center gap-2">
      {msg && <span className="text-xs text-slate-500">{msg}</span>}
      <button
        className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setMsg("");
            const res = await sendAnnouncement(id);
            if (res.error) setMsg(res.error);
            else {
              setMsg(`ส่งแล้ว ${res.count} คน`);
              router.refresh();
            }
          })
        }
      >
        {pending ? "กำลังส่ง…" : "📤 ส่งผ่าน LINE"}
      </button>
    </div>
  );
}
