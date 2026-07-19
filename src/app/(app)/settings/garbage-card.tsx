"use client";

import { useState } from "react";
import { ActionForm } from "@/components/action-form";
import { updateGarbageSettings } from "./actions";

export type GarbageInfo = {
  garbage_mode: "per_room" | "flat";
  garbage_flat: number;
};

export function GarbageCard({ org }: { org: GarbageInfo }) {
  const [mode, setMode] = useState<"per_room" | "flat">(org.garbage_mode || "per_room");
  const isFlat = mode === "flat";

  return (
    <div className="card mb-6 p-5">
      <div className="flex items-center gap-2">
        <span className="text-lg">🗑️</span>
        <h2 className="font-semibold text-slate-900">ค่าขยะ</h2>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        เลือกวิธีคิดค่าขยะ — ระบบจะรวมเข้าบิลของผู้เช่าอัตโนมัติทุกเดือน (เหมือนค่าน้ำ/ค่าไฟ)
      </p>

      <div className="mt-4">
        <ActionForm action={updateGarbageSettings} submitLabel="บันทึกค่าขยะ">
          <div>
            <label className="label">วิธีคิดค่าขยะ</label>
            <div className="grid grid-cols-2 gap-3">
              <ModeOption
                active={!isFlat}
                onClick={() => setMode("per_room")}
                title="ระบุรายห้อง"
                sub="ตั้งจำนวนเงินแยกแต่ละห้อง"
              />
              <ModeOption
                active={isFlat}
                onClick={() => setMode("flat")}
                title="เหมาทุกห้อง"
                sub="ราคาเดียว ใช้กับทุกห้อง"
              />
            </div>
            <input type="hidden" name="garbage_mode" value={mode} />
          </div>

          {isFlat ? (
            <div>
              <label className="label">ค่าขยะเหมา/ห้อง/เดือน (บาท) *</label>
              <input
                name="garbage_flat"
                type="number"
                step="0.01"
                min="0"
                className="field"
                required
                defaultValue={org.garbage_flat}
                placeholder="เช่น 30"
              />
              <p className="mt-1 text-xs text-slate-400">
                ทุกห้องจะถูกคิดค่าขยะเท่ากันตามจำนวนนี้ (ไม่ต้องตั้งรายห้อง)
              </p>
            </div>
          ) : (
            <>
              <input type="hidden" name="garbage_flat" value={org.garbage_flat} />
              <div className="rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
                ตั้งค่าขยะแยกรายห้องได้ที่หน้า{" "}
                <a href="/fees" className="font-semibold text-indigo-600 hover:text-indigo-700">
                  ค่าจอดรถ / ค่าขยะ →
                </a>{" "}
                (ดึงห้องมาทุกห้อง ห้องที่ไม่เก็บใส่ 0)
              </div>
            </>
          )}
        </ActionForm>
      </div>
    </div>
  );
}

function ModeOption({
  active,
  onClick,
  title,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border-2 p-3 text-left transition ${
        active ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-slate-300"
      }`}
    >
      <span className="flex items-center gap-2">
        <span
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
            active ? "border-indigo-600" : "border-slate-300"
          }`}
        >
          {active && <span className="h-2 w-2 rounded-full bg-indigo-600" />}
        </span>
        <span className="font-semibold text-slate-900">{title}</span>
      </span>
      <span className="mt-0.5 block pl-6 text-xs text-slate-400">{sub}</span>
    </button>
  );
}
