"use client";

import { ModalButton } from "@/components/modal";
import { ActionForm } from "@/components/action-form";
import { createVehicle, updateVehicle } from "./actions";
import { VEHICLE_TYPE_LABEL } from "@/lib/format";
import type { Vehicle, VehicleType, Tenant } from "@/lib/types";

export type RoomOpt = { id: string; label: string };

function Fields({
  v,
  rooms,
  tenants,
  defaultRoomId,
}: {
  v?: Vehicle;
  rooms: RoomOpt[];
  tenants: Tenant[];
  defaultRoomId?: string;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">ทะเบียนรถ *</label>
          <input name="plate" className="field" defaultValue={v?.plate} placeholder="1กก 1234" required />
        </div>
        <div>
          <label className="label">ประเภท</label>
          <select name="vehicle_type" className="field" defaultValue={v?.vehicle_type ?? "car"}>
            {(Object.keys(VEHICLE_TYPE_LABEL) as VehicleType[]).map((t) => (
              <option key={t} value={t}>
                {VEHICLE_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label">ยี่ห้อ</label>
          <input name="brand" className="field" defaultValue={v?.brand} />
        </div>
        <div>
          <label className="label">สี</label>
          <input name="color" className="field" defaultValue={v?.color} />
        </div>
        <div>
          <label className="label">เลขสติกเกอร์</label>
          <input name="sticker_no" className="field" defaultValue={v?.sticker_no} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">ห้อง</label>
          <select name="room_id" className="field" defaultValue={v?.room_id ?? defaultRoomId ?? ""}>
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
          <select name="tenant_id" className="field" defaultValue={v?.tenant_id ?? ""}>
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
        <label className="label">หมายเหตุ</label>
        <input name="note" className="field" defaultValue={v?.note} />
      </div>
    </>
  );
}

export function AddVehicleButton({
  rooms,
  tenants,
  defaultRoomId,
  label = "+ เพิ่มยานพาหนะ",
}: {
  rooms: RoomOpt[];
  tenants: Tenant[];
  defaultRoomId?: string;
  label?: string;
}) {
  return (
    <ModalButton label={label} title="เพิ่มยานพาหนะ">
      {(close) => (
        <ActionForm action={createVehicle} onSuccess={close}>
          <Fields rooms={rooms} tenants={tenants} defaultRoomId={defaultRoomId} />
        </ActionForm>
      )}
    </ModalButton>
  );
}

export function EditVehicleButton({
  vehicle,
  rooms,
  tenants,
  label = "แก้ไข",
}: {
  vehicle: Vehicle;
  rooms: RoomOpt[];
  tenants: Tenant[];
  label?: string;
}) {
  return (
    <ModalButton label={label} title="แก้ไขยานพาหนะ" variant="secondary">
      {(close) => (
        <ActionForm action={updateVehicle.bind(null, vehicle.id)} onSuccess={close}>
          <Fields v={vehicle} rooms={rooms} tenants={tenants} />
        </ActionForm>
      )}
    </ModalButton>
  );
}
