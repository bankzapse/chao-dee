"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ModalButton } from "@/components/modal";
import { ActionForm } from "@/components/action-form";
import { createContract, closeContract } from "./actions";
import type { Tenant } from "@/lib/types";

export type RoomOption = {
  id: string;
  label: string; // "อาคาร A - 101"
  base_rent: number;
};

function AddForm({ rooms, tenants }: { rooms: RoomOption[]; tenants: Tenant[] }) {
  const [rent, setRent] = useState<number | "">("");

  return (
    <>
      <div>
        <label className="label">ห้อง *</label>
        <select
          name="room_id"
          className="field"
          defaultValue=""
          required
          onChange={(e) => {
            const room = rooms.find((r) => r.id === e.target.value);
            if (room) setRent(room.base_rent);
          }}
        >
          <option value="" disabled>
            — เลือกห้อง —
          </option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">ผู้เช่า *</label>
        <select name="tenant_id" className="field" defaultValue="" required>
          <option value="" disabled>
            — เลือกผู้เช่า —
          </option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>
              {t.full_name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">วันเริ่มสัญญา *</label>
          <input name="start_date" type="date" className="field" required />
        </div>
        <div>
          <label className="label">วันสิ้นสุด</label>
          <input name="end_date" type="date" className="field" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">ค่าเช่า/เดือน (บาท)</label>
          <input
            name="rent_amount"
            type="number"
            step="0.01"
            className="field"
            value={rent}
            onChange={(e) =>
              setRent(e.target.value === "" ? "" : Number(e.target.value))
            }
          />
        </div>
        <div>
          <label className="label">เงินประกัน (บาท)</label>
          <input name="deposit_amount" type="number" step="0.01" className="field" defaultValue={0} />
        </div>
      </div>
      <div>
        <label className="label">หมายเหตุ</label>
        <input name="note" className="field" />
      </div>
    </>
  );
}

export function AddContractButton({
  rooms,
  tenants,
}: {
  rooms: RoomOption[];
  tenants: Tenant[];
}) {
  const disabled = rooms.length === 0 || tenants.length === 0;
  if (disabled) return null;
  return (
    <ModalButton label="+ ทำสัญญาใหม่" title="สร้างสัญญาเช่า">
      {(close) => (
        <ActionForm action={createContract} onSuccess={close} submitLabel="สร้างสัญญา">
          <AddForm rooms={rooms} tenants={tenants} />
        </ActionForm>
      )}
    </ModalButton>
  );
}

export function CloseContractButton({
  contractId,
  roomId,
}: {
  contractId: string;
  roomId: string;
}) {
  const router = useRouter();
  return (
    <button
      className="text-sm font-medium text-amber-600 hover:text-amber-700"
      onClick={async () => {
        if (!confirm("สิ้นสุดสัญญานี้และคืนห้องเป็นว่าง?")) return;
        await closeContract(contractId, roomId, "ended");
        router.refresh();
      }}
    >
      สิ้นสุด
    </button>
  );
}
