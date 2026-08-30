"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { ModalButton } from "@/components/modal";
import { ActionForm } from "@/components/action-form";
import { createAnnouncement, sendAnnouncement } from "./actions";

export function AddAnnouncementButton({
  buildings = [],
}: {
  buildings?: { id: string; name: string }[];
}) {
  return (
    <ModalButton label="+ เขียนประกาศ" title="เขียนประกาศใหม่">
      {(close) => (
        <ActionForm action={createAnnouncement} onSuccess={close} submitLabel="บันทึกร่าง">
          <div>
            <label className="label">หัวข้อ *</label>
            <input name="title" className="field" placeholder="แจ้งกำหนดชำระค่าเช่า" required />
          </div>
          <div>
            <label className="label">ส่งถึงอาคาร</label>
            <select name="building_id" className="field" defaultValue="">
              <option value="">ทุกอาคาร (ผู้เช่าทั้งหมด)</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-400">
              เลือกอาคารเพื่อส่งเฉพาะผู้เช่าในอาคารนั้น (เช่น ไฟดับเฉพาะสันป่าฝ้าย)
            </p>
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
        {pending ? (
          "กำลังส่ง…"
        ) : (
          <span className="inline-flex items-center gap-1">
            <Send className="h-4 w-4" strokeWidth={2} />
            ส่งผ่าน LINE
          </span>
        )}
      </button>
    </div>
  );
}
