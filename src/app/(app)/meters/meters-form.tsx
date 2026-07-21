"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatBaht } from "@/lib/format";
import { saveMeterReadings, type MeterRow } from "./actions";

function fileToBase64(file: File): Promise<{ data: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      const data = result.split(",")[1] ?? "";
      resolve({ data, mediaType: file.type || "image/jpeg" });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** ปุ่มถ่าย/เลือกรูปมิเตอร์ ให้ AI อ่านค่าให้อัตโนมัติ */
function AiReadButton({
  previous,
  meterType,
  onResult,
  onMessage,
}: {
  previous: number | null;
  meterType: "water" | "electric";
  onResult: (value: number) => void;
  onMessage: (msg: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  async function handle(file: File) {
    setLoading(true);
    onMessage("");
    try {
      const { data, mediaType } = await fileToBase64(file);
      const res = await fetch("/api/ai/read-meter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: data,
          mediaType,
          previous: previous ?? undefined,
          meterType,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        onMessage(json.error ?? "อ่านค่าไม่สำเร็จ");
      } else {
        onResult(json.value);
        const conf =
          json.confidence === "low" ? " (ความมั่นใจต่ำ โปรดตรวจสอบ)" : "";
        onMessage((json.anomaly ? `⚠️ ${json.anomaly}` : `AI อ่านได้ ${json.value}`) + conf);
      }
    } catch {
      onMessage("เกิดข้อผิดพลาดในการอ่านรูป");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handle(f);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        title="ถ่ายรูปให้ AI อ่านมิเตอร์"
        className="rounded-md border border-slate-200 px-1.5 py-1 text-sm hover:bg-indigo-50 disabled:opacity-50"
        disabled={loading}
        onClick={() => inputRef.current?.click()}
      >
        {loading ? "⏳" : "📷"}
      </button>
    </>
  );
}

export type MeterRoom = {
  id: string;
  room_number: string;
  building_id: string;
  building_name: string;
  water_rate: number;
  water_mode: "unit" | "flat_person";
  water_flat_per_person: number;
  electricity_rate: number;
  prev_water: number | null;
  prev_electric: number | null;
  cur_water: number | null;
  cur_electric: number | null;
};

export function MetersForm({
  rooms,
  period,
  defaultDate,
}: {
  rooms: MeterRoom[];
  period: string;
  defaultDate: string;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, { w: string; e: string }>>(
    () =>
      Object.fromEntries(
        rooms.map((r) => [
          r.id,
          {
            w: r.cur_water != null ? String(r.cur_water) : "",
            e: r.cur_electric != null ? String(r.cur_electric) : "",
          },
        ])
      )
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const buildings = Array.from(
    new Map(rooms.map((r) => [r.building_id, r.building_name])).entries()
  ).sort((a, z) => a[1].localeCompare(z[1], "th"));

  // กรองอาคาร "ฝั่ง client" เท่านั้น — rooms prop ยังครบทุกอาคารเสมอ
  // จึงสลับอาคารได้โดยค่าที่กรอกค้างไว้ไม่หาย และกดบันทึกครั้งเดียวได้ทุกอาคาร
  // จดทีละอาคารเสมอ (ไม่มีตัวเลือก "ทุกอาคาร") — เอามารวมกันแล้วจดสลับห้องกัน
  const [buildingFilter, setBuildingFilter] = useState<string>(buildings[0]?.[0] ?? "");

  const visibleRooms = rooms.filter((r) => r.building_id === buildingFilter);

  function set(roomId: string, key: "w" | "e", v: string) {
    setValues((prev) => ({ ...prev, [roomId]: { ...prev[roomId], [key]: v } }));
  }

  async function save() {
    setSaving(true);
    setMsg("");
    // วนทุกห้อง (ไม่ใช่แค่ที่แสดงอยู่) — บันทึกครบทุกอาคารในคลิกเดียว ค่าที่กรอกไว้จึงไม่ตกหล่น
    const saved = rooms.filter((r) => {
      const v = values[r.id] ?? { w: "", e: "" };
      const hasWater = r.water_mode !== "flat_person" && v.w !== "";
      return hasWater || v.e !== "";
    });
    const rows: MeterRow[] = saved.map((r) => {
      const v = values[r.id] ?? { w: "", e: "" };
      return {
        room_id: r.id,
        // ห้องเหมาจ่ายน้ำ ไม่บันทึกมิเตอร์น้ำ (คิดตอนออกบิลตามจำนวนผู้พัก)
        water_value: r.water_mode === "flat_person" ? 0 : Number(v.w) || 0,
        electric_value: Number(v.e) || 0,
      };
    });
    const res = await saveMeterReadings(period, defaultDate, rows);
    setSaving(false);
    if (res?.error) setMsg("เกิดข้อผิดพลาด: " + res.error);
    else {
      // สรุปแยกรายอาคาร เพื่อให้เห็นว่าอาคารไหนบันทึกไปกี่ห้อง
      const perBuilding = new Map<string, number>();
      saved.forEach((r) => perBuilding.set(r.building_name, (perBuilding.get(r.building_name) ?? 0) + 1));
      const detail =
        perBuilding.size > 1
          ? ` (${[...perBuilding.entries()].map(([n, c]) => `${n} ${c}`).join(" · ")})`
          : "";
      setMsg(`บันทึกแล้ว ${rows.length} ห้อง${detail}`);
      router.refresh();
    }
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
        {buildings.length > 1 ? (
          <div className="flex flex-wrap gap-2">
            {buildings.map(([id, name]) => (
              <BuildingTab
                key={id}
                active={buildingFilter === id}
                onClick={() => setBuildingFilter(id)}
                label={`${name} (${rooms.filter((r) => r.building_id === id).length})`}
              />
            ))}
          </div>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-3">
          {msg && <span className="text-sm text-emerald-600">{msg}</span>}
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? "กำลังบันทึก…" : "💾 บันทึกค่ามิเตอร์"}
          </button>
        </div>
      </div>
      {buildings.length > 1 && (
        <p className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-500">
          สลับอาคารได้อิสระ — ค่าที่กรอกค้างไว้จะไม่หาย และกด “บันทึกค่ามิเตอร์” ครั้งเดียวบันทึกให้ทุกอาคาร
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">ห้อง</th>
              <th className="px-3 py-3 font-medium">น้ำ (ก่อน)</th>
              <th className="px-3 py-3 font-medium">น้ำ (ปัจจุบัน)</th>
              <th className="px-3 py-3 font-medium">หน่วยน้ำ / ค่าน้ำ</th>
              <th className="px-3 py-3 font-medium">ไฟ (ก่อน)</th>
              <th className="px-3 py-3 font-medium">ไฟ (ปัจจุบัน)</th>
              <th className="px-3 py-3 font-medium">หน่วยไฟ / ค่าไฟ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleRooms.map((r) => {
              const v = values[r.id] ?? { w: "", e: "" };
              const w = v.w === "" ? null : Number(v.w);
              const e = v.e === "" ? null : Number(v.e);
              const wu =
                w != null && r.prev_water != null ? Math.max(0, w - r.prev_water) : null;
              const eu =
                e != null && r.prev_electric != null
                  ? Math.max(0, e - r.prev_electric)
                  : null;
              return (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium text-slate-900">
                    {r.building_name} · {r.room_number}
                  </td>
                  {r.water_mode === "flat_person" ? (
                    <td colSpan={3} className="px-3 py-2">
                      <span className="rounded-md bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700">
                        เหมาจ่าย {formatBaht(r.water_flat_per_person)}/คน
                      </span>
                    </td>
                  ) : (
                    <>
                      <td className="px-3 py-2 text-slate-400">{r.prev_water ?? "-"}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.01"
                            className="field w-24"
                            value={v.w}
                            onChange={(ev) => set(r.id, "w", ev.target.value)}
                          />
                          <AiReadButton
                            previous={r.prev_water}
                            meterType="water"
                            onResult={(v) => set(r.id, "w", String(v))}
                            onMessage={setMsg}
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2 text-sky-600">
                        {wu != null ? (
                          <span>
                            <span className="font-medium">{wu}</span>{" "}
                            <span className="text-xs text-slate-400">หน่วย · {formatBaht(wu * r.water_rate)}</span>
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                    </>
                  )}
                  <td className="px-3 py-2 text-slate-400">{r.prev_electric ?? "-"}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.01"
                        className="field w-24"
                        value={v.e}
                        onChange={(ev) => set(r.id, "e", ev.target.value)}
                      />
                      <AiReadButton
                        previous={r.prev_electric}
                        meterType="electric"
                        onResult={(v) => set(r.id, "e", String(v))}
                        onMessage={setMsg}
                      />
                    </div>
                  </td>
                  <td className="px-3 py-2 text-amber-600">
                    {eu != null ? (
                      <span>
                        <span className="font-medium">{eu}</span>{" "}
                        <span className="text-xs text-slate-400">หน่วย · {formatBaht(eu * r.electricity_rate)}</span>
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BuildingTab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
        active ? "bg-indigo-600 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}
