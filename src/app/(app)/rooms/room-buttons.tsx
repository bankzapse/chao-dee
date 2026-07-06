"use client";

import { useState } from "react";
import { ModalButton } from "@/components/modal";
import { ActionForm } from "@/components/action-form";
import { createRoom, createRoomsBulk, updateRoom } from "./actions";
import { ROOM_STATUS_LABEL } from "@/lib/format";
import type { Building, Room, RoomStatus } from "@/lib/types";

/** เลือกวิธีคิดค่าน้ำ: ตามหน่วยมิเตอร์ หรือ เหมาจ่าย/คน */
function WaterFields({ r }: { r?: Room }) {
  const [mode, setMode] = useState<"unit" | "flat_person">(r?.water_mode ?? "unit");
  return (
    <div>
      <label className="label">ค่าน้ำ</label>
      <div className="mb-2 inline-flex rounded-lg bg-slate-100 p-1 text-sm">
        <button
          type="button"
          onClick={() => setMode("unit")}
          className={`rounded-md px-3 py-1 font-medium ${mode === "unit" ? "bg-white shadow-sm text-slate-900" : "text-slate-500"}`}
        >
          ตามหน่วยมิเตอร์
        </button>
        <button
          type="button"
          onClick={() => setMode("flat_person")}
          className={`rounded-md px-3 py-1 font-medium ${mode === "flat_person" ? "bg-white shadow-sm text-slate-900" : "text-slate-500"}`}
        >
          เหมาจ่าย/คน
        </button>
      </div>
      <input type="hidden" name="water_mode" value={mode} />
      {mode === "unit" ? (
        <input
          name="water_rate"
          type="number"
          step="0.01"
          className="field"
          defaultValue={r?.water_rate ?? 0}
          placeholder="บาท/หน่วย"
        />
      ) : (
        <div>
          <input
            name="water_flat_per_person"
            type="number"
            step="0.01"
            className="field"
            defaultValue={r?.water_flat_per_person ?? 0}
            placeholder="บาท/คน/เดือน"
          />
          <p className="mt-1 text-xs text-slate-400">คิด = จำนวนผู้พักในสัญญา × ค่านี้ (ไม่ต้องจดมิเตอร์น้ำ)</p>
        </div>
      )}
    </div>
  );
}

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
        <WaterFields r={r} />
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

export function BulkAddRoomsButton({
  buildings,
  defaultBuilding,
}: {
  buildings: Building[];
  defaultBuilding?: string;
}) {
  if (buildings.length === 0) return null;
  return (
    <ModalButton label="+ เพิ่มหลายห้อง" title="เพิ่มหลายห้องพร้อมกัน" variant="secondary">
      {(close) => (
        <ActionForm action={createRoomsBulk} onSuccess={close} submitLabel="สร้างห้อง">
          <div>
            <label className="label">อาคาร *</label>
            <select name="building_id" className="field" defaultValue={defaultBuilding ?? ""} required>
              <option value="" disabled>— เลือกอาคาร —</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">ชั้น</label>
              <input name="floor" type="number" className="field" defaultValue={1} min={0} />
            </div>
            <div>
              <label className="label">จำนวนห้อง *</label>
              <input name="count" type="number" className="field" defaultValue={10} min={1} max={200} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">คำนำหน้าเลขห้อง</label>
              <input name="prefix" className="field" placeholder="เช่น A หรือ 1 (ได้ A1, A2…)" />
            </div>
            <div>
              <label className="label">เริ่มจากเลข</label>
              <input name="start" type="number" className="field" defaultValue={1} />
            </div>
          </div>
          <p className="text-xs text-slate-400">
            ตัวอย่าง: prefix “2” เริ่มที่ 1 จำนวน 10 → ได้ห้อง 21, 22, … 210
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">ค่าเช่า</label>
              <input name="base_rent" type="number" step="0.01" className="field" defaultValue={0} />
            </div>
            <div>
              <label className="label">ค่าน้ำ/หน่วย</label>
              <input name="water_rate" type="number" step="0.01" className="field" defaultValue={0} />
            </div>
            <div>
              <label className="label">ค่าไฟ/หน่วย</label>
              <input name="electricity_rate" type="number" step="0.01" className="field" defaultValue={0} />
            </div>
          </div>
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
