"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatBaht } from "@/lib/format";
import { saveRoomFees, type RoomFeeRow } from "../actions";

export type FeeRoom = {
  id: string;
  room_number: string;
  building_name: string;
  parking_fee: number;
  garbage_fee: number;
};

export function FeesForm({
  rooms,
  garbageFlatMode,
  garbageFlat,
}: {
  rooms: FeeRoom[];
  garbageFlatMode: boolean;
  garbageFlat: number;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, { p: string; g: string }>>(() =>
    Object.fromEntries(
      rooms.map((r) => [r.id, { p: String(Number(r.parking_fee ?? 0)), g: String(Number(r.garbage_fee ?? 0)) }])
    )
  );
  const [fillP, setFillP] = useState("");
  const [fillG, setFillG] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok?: boolean; text: string } | null>(null);

  function set(id: string, key: "p" | "g", v: string) {
    setValues((prev) => ({ ...prev, [id]: { ...prev[id], [key]: v } }));
  }
  function fillAll(key: "p" | "g", v: string) {
    if (v === "") return;
    setValues((prev) => Object.fromEntries(Object.entries(prev).map(([k, o]) => [k, { ...o, [key]: v }])));
  }

  const totalParking = rooms.reduce((s, r) => s + (Number(values[r.id]?.p) || 0), 0);
  const totalGarbage = rooms.reduce((s, r) => s + (Number(values[r.id]?.g) || 0), 0);

  async function save() {
    setSaving(true);
    setMsg(null);
    const rows: RoomFeeRow[] = rooms.map((r) => ({
      id: r.id,
      parking_fee: Number(values[r.id]?.p) || 0,
      garbage_fee: Number(values[r.id]?.g) || 0,
    }));
    const res = await saveRoomFees(rows);
    setSaving(false);
    if (res?.error) setMsg({ text: res.error });
    else {
      setMsg({ ok: true, text: `บันทึกแล้ว ${rows.length} ห้อง` });
      router.refresh();
    }
  }

  return (
    <div className="card overflow-hidden">
      {/* แถบเครื่องมือ: เติมค่าทุกห้อง + บันทึก */}
      <div className="flex flex-wrap items-end gap-3 border-b border-slate-200 p-4">
        <div>
          <label className="label">เติมค่าจอดรถทุกห้อง</label>
          <div className="flex gap-2">
            <input
              type="number"
              step="0.01"
              min="0"
              className="field w-28"
              value={fillP}
              onChange={(e) => setFillP(e.target.value)}
              placeholder="เช่น 300"
            />
            <button type="button" className="btn-secondary whitespace-nowrap" onClick={() => fillAll("p", fillP)}>
              เติมทุกห้อง
            </button>
          </div>
        </div>
        <div>
          <label className="label">เติมค่าขยะทุกห้อง</label>
          <div className="flex gap-2">
            <input
              type="number"
              step="0.01"
              min="0"
              className="field w-28"
              value={fillG}
              onChange={(e) => setFillG(e.target.value)}
              placeholder="เช่น 30"
            />
            <button type="button" className="btn-secondary whitespace-nowrap" onClick={() => fillAll("g", fillG)}>
              เติมทุกห้อง
            </button>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {msg && (
            <span className={`text-sm ${msg.ok ? "text-emerald-600" : "text-rose-600"}`}>{msg.text}</span>
          )}
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? "กำลังบันทึก…" : "💾 บันทึกทั้งหมด"}
          </button>
        </div>
      </div>

      {garbageFlatMode && (
        <p className="border-b border-amber-100 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
          ตอนนี้ตั้งค่าขยะเป็นโหมด <b>เหมาทุกห้อง ({formatBaht(garbageFlat)}/ห้อง)</b> — ระบบจะคิดค่าขยะตามราคาเหมา
          ไม่ใช้ค่ารายห้องด้านล่าง (เปลี่ยนโหมดได้ที่หน้าตั้งค่า)
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">ห้อง</th>
              <th className="px-3 py-3 font-medium">ค่าจอดรถ/เดือน</th>
              <th className="px-3 py-3 font-medium">ค่าขยะ/เดือน</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rooms.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-2 font-medium text-slate-900">
                  {r.building_name} · {r.room_number}
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="field w-32"
                    value={values[r.id]?.p ?? "0"}
                    onChange={(e) => set(r.id, "p", e.target.value)}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="field w-32"
                    value={values[r.id]?.g ?? "0"}
                    onChange={(e) => set(r.id, "g", e.target.value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-slate-200 bg-slate-50 text-slate-600">
            <tr>
              <td className="px-4 py-3 font-medium">รวม {rooms.length} ห้อง</td>
              <td className="px-3 py-3 font-semibold">{formatBaht(totalParking)}</td>
              <td className="px-3 py-3 font-semibold">{formatBaht(totalGarbage)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
