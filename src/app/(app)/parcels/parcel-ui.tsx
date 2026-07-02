"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ModalButton } from "@/components/modal";
import { ActionForm } from "@/components/action-form";
import { createParcel, markPickedUp } from "./actions";
import type { Tenant } from "@/lib/types";

export type RoomOpt = { id: string; label: string };

export function AddParcelButton({
  rooms,
  tenants,
  today,
}: {
  rooms: RoomOpt[];
  tenants: Tenant[];
  today: string;
}) {
  return (
    <ModalButton label="+ รับพัสดุเข้า" title="บันทึกพัสดุเข้า">
      {(close) => (
        <ActionForm action={createParcel} onSuccess={close}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">ห้อง</label>
              <select name="room_id" className="field" defaultValue="">
                <option value="">— ไม่ระบุ —</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">ผู้เช่า (แจ้ง LINE)</label>
              <select name="tenant_id" className="field" defaultValue="">
                <option value="">— ไม่ระบุ —</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">ขนส่ง</label>
              <input name="carrier" className="field" placeholder="Kerry / Flash / ไปรษณีย์" />
            </div>
            <div>
              <label className="label">เลขพัสดุ</label>
              <input name="tracking_no" className="field" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">ผู้รับ</label>
              <input name="recipient" className="field" />
            </div>
            <div>
              <label className="label">วันที่รับเข้า *</label>
              <input name="received_at" type="date" className="field" defaultValue={today} required />
            </div>
          </div>
          <div>
            <label className="label">หมายเหตุ</label>
            <input name="note" className="field" />
          </div>
        </ActionForm>
      )}
    </ModalButton>
  );
}

export function PickUpButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await markPickedUp(id);
          router.refresh();
        })
      }
    >
      ✓ รับแล้ว
    </button>
  );
}
