"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ModalButton } from "@/components/modal";
import { ActionForm } from "@/components/action-form";
import { createContract, updateContract, closeContract } from "./actions";
import { Spinner } from "@/components/spinner";
import type { Tenant, Contract } from "@/lib/types";

export type RoomOption = {
  id: string;
  label: string; // "อาคาร A - 101"
  base_rent: number;
};

/** ฟิลด์การเงิน/ผู้พัก/ค่าปรับ/เงื่อนไข — ใช้ร่วมทั้งสร้างและแก้สัญญา */
function MoneyAndTerms({ c, rent, setRent }: { c?: Contract; rent: number | ""; setRent: (v: number | "") => void }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">วันเริ่มสัญญา *</label>
          <input name="start_date" type="date" className="field" defaultValue={c?.start_date} required />
        </div>
        <div>
          <label className="label">วันสิ้นสุด</label>
          <input name="end_date" type="date" className="field" defaultValue={c?.end_date ?? ""} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label">ค่าเช่า/เดือน</label>
          <input
            name="rent_amount"
            type="number"
            step="0.01"
            className="field"
            value={rent}
            onChange={(e) => setRent(e.target.value === "" ? "" : Number(e.target.value))}
          />
        </div>
        <div>
          <label className="label">เงินประกัน</label>
          <input name="deposit_amount" type="number" step="0.01" className="field" defaultValue={c?.deposit_amount ?? 0} />
        </div>
        <div>
          <label className="label">จำนวนผู้พัก</label>
          <input name="occupant_count" type="number" min={1} className="field" defaultValue={c?.occupant_count ?? 1} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">ค่าปรับชำระล่าช้า (บาท)</label>
          <input name="late_fee" type="number" step="0.01" className="field" defaultValue={c?.late_fee ?? 0} />
        </div>
        <div>
          <label className="label">รูปแบบค่าปรับ</label>
          <select name="late_fee_mode" className="field" defaultValue={c?.late_fee_mode ?? "once"}>
            <option value="once">ต่อครั้ง</option>
            <option value="per_day">ต่อวัน</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label">เงื่อนไข/ข้อตกลงเพิ่มเติม</label>
        <textarea name="terms" className="field" rows={2} defaultValue={c?.terms} placeholder="เช่น แจ้งล่วงหน้า 30 วันก่อนย้ายออก, ห้ามเลี้ยงสัตว์" />
      </div>
      <div>
        <label className="label">หมายเหตุ</label>
        <input name="note" className="field" defaultValue={c?.note} />
      </div>
    </>
  );
}

export type DealOption = { lead_id: string; label: string };

function AddForm({
  rooms,
  tenants,
  deals = [],
}: {
  rooms: RoomOption[];
  tenants: Tenant[];
  deals?: DealOption[];
}) {
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
      {deals.length > 0 && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3">
          <label className="label">🤝 ผู้เช่ารายนี้มาจาก Chao-Dee หรือไม่?</label>
          <select name="lead_id" className="field" defaultValue="">
            <option value="">— ไม่ใช่ / หาเอง —</option>
            {deals.map((d) => (
              <option key={d.lead_id} value={d.lead_id}>
                {d.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">
            ถ้าเลือก ระบบจะบันทึกเป็นดีลนายหน้าและคิดค่านายหน้า 1 เดือนตามสัญญาที่ตกลงไว้
          </p>
        </div>
      )}
      <MoneyAndTerms rent={rent} setRent={setRent} />
    </>
  );
}

function EditForm({ contract, roomLabel, tenantName }: { contract: Contract; roomLabel: string; tenantName: string }) {
  const [rent, setRent] = useState<number | "">(Number(contract.rent_amount));
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">ห้อง</label>
          <input className="field bg-slate-50 text-slate-500" value={roomLabel} disabled />
        </div>
        <div>
          <label className="label">ผู้เช่า</label>
          <input className="field bg-slate-50 text-slate-500" value={tenantName} disabled />
        </div>
      </div>
      <MoneyAndTerms c={contract} rent={rent} setRent={setRent} />
    </>
  );
}

export function AddContractButton({
  rooms,
  tenants,
  deals = [],
}: {
  rooms: RoomOption[];
  tenants: Tenant[];
  deals?: DealOption[];
}) {
  const disabled = rooms.length === 0 || tenants.length === 0;
  if (disabled) return null;
  return (
    <ModalButton label="+ ทำสัญญาใหม่" title="สร้างสัญญาเช่า">
      {(close) => (
        <ActionForm action={createContract} onSuccess={close} submitLabel="สร้างสัญญา">
          <AddForm rooms={rooms} tenants={tenants} deals={deals} />
        </ActionForm>
      )}
    </ModalButton>
  );
}

export function EditContractButton({
  contract,
  roomLabel,
  tenantName,
}: {
  contract: Contract;
  roomLabel: string;
  tenantName: string;
}) {
  return (
    <ModalButton label="แก้ไข" title="แก้ไขสัญญาเช่า" variant="secondary">
      {(close) => (
        <ActionForm action={updateContract.bind(null, contract.id)} onSuccess={close} submitLabel="บันทึกสัญญา">
          <EditForm contract={contract} roomLabel={roomLabel} tenantName={tenantName} />
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
  const [pending, start] = useTransition();
  return (
    <button
      className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-600 hover:text-amber-700 disabled:opacity-50"
      disabled={pending}
      onClick={() => {
        if (!confirm("สิ้นสุดสัญญานี้และคืนห้องเป็นว่าง?")) return;
        start(async () => {
          await closeContract(contractId, roomId, "ended");
          router.refresh();
        });
      }}
    >
      {pending && <Spinner className="!h-3.5 !w-3.5" />}
      {pending ? "กำลังบันทึก…" : "สิ้นสุด"}
    </button>
  );
}
