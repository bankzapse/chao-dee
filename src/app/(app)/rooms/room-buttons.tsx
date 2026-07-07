"use client";

import { useState } from "react";
import { ModalButton } from "@/components/modal";
import { ActionForm } from "@/components/action-form";
import { createRoom, createRoomsBulk, updateRoom } from "./actions";
import { ROOM_STATUS_LABEL } from "@/lib/format";
import type { Building, Room, RoomStatus } from "@/lib/types";

/** เลือกวิธีคิดค่าน้ำ: ตามหน่วยมิเตอร์ หรือ เหมาจ่าย/คน */
type Vals = Record<string, unknown> | undefined;

function WaterFields({ r, v }: { r?: Room; v?: Vals }) {
  const [mode, setMode] = useState<"unit" | "flat_person">(
    (v?.water_mode as "unit" | "flat_person") ?? r?.water_mode ?? "unit"
  );
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
          defaultValue={Number(v?.water_rate ?? r?.water_rate ?? 0)}
          placeholder="บาท/หน่วย"
        />
      ) : (
        <div>
          <input
            name="water_flat_per_person"
            type="number"
            step="0.01"
            className="field"
            defaultValue={Number(v?.water_flat_per_person ?? r?.water_flat_per_person ?? 0)}
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
  v,
}: {
  buildings: Building[];
  r?: Room;
  defaultBuilding?: string;
  v?: Vals;
}) {
  // controlled — เพื่อให้เลือกชั้นตามจำนวนชั้นของอาคาร และคงค่าไว้เมื่อบันทึกไม่สำเร็จ
  const [buildingId, setBuildingId] = useState(
    (v?.building_id as string) ?? r?.building_id ?? defaultBuilding ?? ""
  );
  const [floor, setFloor] = useState(Number(v?.floor ?? r?.floor ?? 1));
  const selected = buildings.find((b) => b.id === buildingId);
  // มีข้อมูลจำนวนชั้น (รัน migration แล้ว) → ใช้ dropdown จำกัดตามอาคาร
  const buildingHasFloors = Boolean(selected && (selected.floors ?? 0) >= 1);
  const floorCount = Math.max(1, selected?.floors ?? 1);
  // รวมชั้นที่ห้องนี้อยู่ (กรณีแก้ไขห้องที่ชั้นเกินจำนวนชั้นปัจจุบัน)
  const floorSet = new Set<number>();
  for (let i = 1; i <= floorCount; i++) floorSet.add(i);
  floorSet.add(floor);
  const floorOptions = [...floorSet].sort((a, b) => a - b);

  return (
    <>
      <div>
        <label className="label">อาคาร *</label>
        <select
          name="building_id"
          className="field"
          value={buildingId}
          onChange={(e) => setBuildingId(e.target.value)}
          required
        >
          <option value="" disabled>
            — เลือกอาคาร —
          </option>
          {buildings.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} {(b.floors ?? 0) > 1 ? `(${b.floors} ชั้น)` : ""}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">เลขห้อง *</label>
          <input name="room_number" className="field" defaultValue={(v?.room_number as string) ?? r?.room_number} placeholder="101" required />
        </div>
        <div>
          <label className="label">ชั้น</label>
          {buildingHasFloors ? (
            <select name="floor" className="field" value={floor} onChange={(e) => setFloor(Number(e.target.value))}>
              {floorOptions.map((f) => (
                <option key={f} value={f}>
                  ชั้น {f}
                </option>
              ))}
            </select>
          ) : (
            <input
              name="floor"
              type="number"
              min={0}
              className="field"
              value={floor}
              onChange={(e) => setFloor(Number(e.target.value))}
            />
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">ขนาด (ตร.ม.)</label>
          <input name="size_sqm" type="number" step="0.01" className="field" defaultValue={Number(v?.size_sqm ?? r?.size_sqm ?? 0)} />
        </div>
        <div>
          <label className="label">ค่าเช่า/เดือน (บาท)</label>
          <input name="base_rent" type="number" step="0.01" className="field" defaultValue={Number(v?.base_rent ?? r?.base_rent ?? 0)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <WaterFields r={r} v={v} />
        <div>
          <label className="label">ค่าไฟ/หน่วย</label>
          <input name="electricity_rate" type="number" step="0.01" className="field" defaultValue={Number(v?.electricity_rate ?? r?.electricity_rate ?? 0)} />
        </div>
      </div>
      <div>
        <label className="label">สถานะ</label>
        <select name="status" className="field" defaultValue={(v?.status as string) ?? r?.status ?? "vacant"}>
          {(Object.keys(ROOM_STATUS_LABEL) as RoomStatus[]).map((s) => (
            <option key={s} value={s}>
              {ROOM_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">หมายเหตุ</label>
        <input name="note" className="field" defaultValue={(v?.note as string) ?? r?.note} />
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
          {(state) => <Fields buildings={buildings} defaultBuilding={defaultBuilding} v={state?.values} />}
        </ActionForm>
      )}
    </ModalButton>
  );
}

/** เลือกอาคาร + ชั้น สำหรับฟอร์มเพิ่มหลายห้อง (ชั้นตามจำนวนชั้นของอาคาร) */
function BulkBuildingFloor({ buildings, defaultBuilding, v }: { buildings: Building[]; defaultBuilding?: string; v?: Vals }) {
  const [buildingId, setBuildingId] = useState((v?.building_id as string) ?? defaultBuilding ?? "");
  const [floor, setFloor] = useState(Number(v?.floor ?? 1));
  const selected = buildings.find((b) => b.id === buildingId);
  const buildingHasFloors = Boolean(selected && (selected.floors ?? 0) >= 1);
  const floorCount = Math.max(1, selected?.floors ?? 1);
  const floorOptions = Array.from({ length: floorCount }, (_, i) => i + 1);
  return (
    <>
      <div>
        <label className="label">อาคาร *</label>
        <select
          name="building_id"
          className="field"
          value={buildingId}
          onChange={(e) => {
            setBuildingId(e.target.value);
            setFloor(1);
          }}
          required
        >
          <option value="" disabled>— เลือกอาคาร —</option>
          {buildings.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} {(b.floors ?? 0) > 1 ? `(${b.floors} ชั้น)` : ""}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">ชั้น</label>
        {buildingHasFloors ? (
          <select name="floor" className="field" value={floor} onChange={(e) => setFloor(Number(e.target.value))}>
            {floorOptions.map((f) => (
              <option key={f} value={f}>ชั้น {f}</option>
            ))}
          </select>
        ) : (
          <input
            name="floor"
            type="number"
            min={0}
            className="field"
            value={floor}
            onChange={(e) => setFloor(Number(e.target.value))}
          />
        )}
      </div>
    </>
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
          {(state) => {
            const v = state?.values;
            return (
              <>
          <BulkBuildingFloor buildings={buildings} defaultBuilding={defaultBuilding} v={v} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">จำนวนห้อง *</label>
              <input name="count" type="number" className="field" defaultValue={Number(v?.count ?? 10)} min={1} max={200} required />
            </div>
            <div className="hidden sm:block" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">คำนำหน้าเลขห้อง</label>
              <input name="prefix" className="field" placeholder="เช่น A หรือ 1 (ได้ A1, A2…)" defaultValue={(v?.prefix as string) ?? ""} />
            </div>
            <div>
              <label className="label">เริ่มจากเลข</label>
              <input name="start" type="number" className="field" defaultValue={Number(v?.start ?? 1)} />
            </div>
          </div>
          <p className="text-xs text-slate-400">
            ตัวอย่าง: prefix “2” เริ่มที่ 1 จำนวน 10 → ได้ห้อง 21, 22, … 210
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">ค่าเช่า</label>
              <input name="base_rent" type="number" step="0.01" className="field" defaultValue={Number(v?.base_rent ?? 0)} />
            </div>
            <div>
              <label className="label">ค่าน้ำ/หน่วย</label>
              <input name="water_rate" type="number" step="0.01" className="field" defaultValue={Number(v?.water_rate ?? 0)} />
            </div>
            <div>
              <label className="label">ค่าไฟ/หน่วย</label>
              <input name="electricity_rate" type="number" step="0.01" className="field" defaultValue={Number(v?.electricity_rate ?? 0)} />
            </div>
          </div>
              </>
            );
          }}
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
          {(state) => <Fields buildings={buildings} r={room} v={state?.values} />}
        </ActionForm>
      )}
    </ModalButton>
  );
}
