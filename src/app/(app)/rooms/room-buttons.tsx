"use client";

import { ModalButton } from "@/components/modal";
import { ActionForm } from "@/components/action-form";
import { createRoom, updateRoom } from "./actions";
import { ROOM_STATUS_LABEL } from "@/lib/format";
import type { Building, Room, RoomStatus } from "@/lib/types";

function Fields({
  buildings,
  r,
  defaultBuilding,
}: {
  buildings: Building[];
  r?: Room;
  defaultBuilding?: string;
}) {
  return (
    <>
      <div>
        <label className="label">อาคาร *</label>
        <select
          name="building_id"
          className="field"
          defaultValue={r?.building_id ?? defaultBuilding ?? ""}
          required
        >
          <option value="" disabled>
            — เลือกอาคาร —
          </option>
          {buildings.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">เลขห้อง *</label>
          <input name="room_number" className="field" defaultValue={r?.room_number} placeholder="101" required />
        </div>
        <div>
          <label className="label">ชั้น</label>
          <input name="floor" type="number" className="field" defaultValue={r?.floor ?? 1} min={0} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">ขนาด (ตร.ม.)</label>
          <input name="size_sqm" type="number" step="0.01" className="field" defaultValue={r?.size_sqm ?? 0} />
        </div>
        <div>
          <label className="label">ค่าเช่า/เดือน (บาท)</label>
          <input name="base_rent" type="number" step="0.01" className="field" defaultValue={r?.base_rent ?? 0} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">ค่าน้ำ/หน่วย</label>
          <input name="water_rate" type="number" step="0.01" className="field" defaultValue={r?.water_rate ?? 0} />
        </div>
        <div>
          <label className="label">ค่าไฟ/หน่วย</label>
          <input name="electricity_rate" type="number" step="0.01" className="field" defaultValue={r?.electricity_rate ?? 0} />
        </div>
      </div>
      <div>
        <label className="label">สถานะ</label>
        <select name="status" className="field" defaultValue={r?.status ?? "vacant"}>
          {(Object.keys(ROOM_STATUS_LABEL) as RoomStatus[]).map((s) => (
            <option key={s} value={s}>
              {ROOM_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">หมายเหตุ</label>
        <input name="note" className="field" defaultValue={r?.note} />
      </div>
    </>
  );
}

export function AddRoomButton({
  buildings,
  defaultBuilding,
}: {
  buildings: Building[];
  defaultBuilding?: string;
}) {
  if (buildings.length === 0) return null;
  return (
    <ModalButton label="+ เพิ่มห้อง" title="เพิ่มห้องพัก">
      {(close) => (
        <ActionForm action={createRoom} onSuccess={close}>
          <Fields buildings={buildings} defaultBuilding={defaultBuilding} />
        </ActionForm>
      )}
    </ModalButton>
  );
}

export function EditRoomButton({
  room,
  buildings,
}: {
  room: Room;
  buildings: Building[];
}) {
  return (
    <ModalButton label="แก้ไข" title={`ห้อง ${room.room_number}`} variant="secondary">
      {(close) => (
        <ActionForm action={updateRoom.bind(null, room.id)} onSuccess={close}>
          <Fields buildings={buildings} r={room} />
        </ActionForm>
      )}
    </ModalButton>
  );
}
