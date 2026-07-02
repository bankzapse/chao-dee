"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ModalButton } from "@/components/modal";
import { ActionForm } from "@/components/action-form";
import { createMaintenance, updateMaintenanceStatus } from "./actions";
import { MAINTENANCE_STATUS_LABEL } from "@/lib/format";
import type { MaintenanceStatus, Tenant } from "@/lib/types";

export type RoomOpt = { id: string; label: string };

export function AddMaintenanceButton({
  rooms,
  tenants,
}: {
  rooms: RoomOpt[];
  tenants: Tenant[];
}) {
  return (
    <ModalButton label="+ แจ้งซ่อม" title="เพิ่มงานแจ้งซ่อม">
      {(close) => (
        <ActionForm action={createMaintenance} onSuccess={close}>
          <div>
            <label className="label">หัวข้อ *</label>
            <input name="title" className="field" placeholder="ก๊อกน้ำรั่ว" required />
          </div>
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
              <label className="label">ผู้เช่า</label>
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
          <div>
            <label className="label">รายละเอียด</label>
            <textarea name="description" className="field" rows={3} />
          </div>
        </ActionForm>
      )}
    </ModalButton>
  );
}

export function StatusSelect({
  id,
  value,
}: {
  id: string;
  value: MaintenanceStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <select
      className="field w-auto py-1 text-sm"
      value={value}
      disabled={pending}
      onChange={(e) =>
        startTransition(async () => {
          await updateMaintenanceStatus(id, e.target.value as MaintenanceStatus);
          router.refresh();
        })
      }
    >
      {(Object.keys(MAINTENANCE_STATUS_LABEL) as MaintenanceStatus[]).map((s) => (
        <option key={s} value={s}>
          {MAINTENANCE_STATUS_LABEL[s]}
        </option>
      ))}
    </select>
  );
}
