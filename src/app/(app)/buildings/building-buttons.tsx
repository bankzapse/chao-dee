"use client";

import { ModalButton } from "@/components/modal";
import { ActionForm } from "@/components/action-form";
import { createBuilding, updateBuilding } from "./actions";
import type { Building } from "@/lib/types";

function Fields({ b }: { b?: Building }) {
  return (
    <>
      <div>
        <label className="label">ชื่ออาคาร *</label>
        <input name="name" className="field" defaultValue={b?.name} placeholder="อาคาร A" required />
      </div>
      <div>
        <label className="label">ที่อยู่</label>
        <input name="address" className="field" defaultValue={b?.address} placeholder="123 ถ.สุขุมวิท…" />
      </div>
      <div>
        <label className="label">หมายเหตุ</label>
        <textarea name="note" className="field" defaultValue={b?.note} rows={2} />
      </div>
    </>
  );
}

export function AddBuildingButton() {
  return (
    <ModalButton label="+ เพิ่มอาคาร" title="เพิ่มอาคารใหม่">
      {(close) => (
        <ActionForm action={createBuilding} onSuccess={close}>
          <Fields />
        </ActionForm>
      )}
    </ModalButton>
  );
}

export function EditBuildingButton({ building }: { building: Building }) {
  return (
    <ModalButton label="แก้ไข" title="แก้ไขอาคาร" variant="secondary">
      {(close) => (
        <ActionForm
          action={updateBuilding.bind(null, building.id)}
          onSuccess={close}
        >
          <Fields b={building} />
        </ActionForm>
      )}
    </ModalButton>
  );
}
