"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
  building_name: string;
  water_rate: number;
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
  const [date, setDate] = useState(defaultDate);
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

  function set(roomId: string, key: "w" | "e", v: string) {
    setValues((prev) => ({ ...prev, [roomId]: { ...prev[roomId], [key]: v } }));
  }

  async function save() {
    setSaving(true);
    setMsg("");
    const rows: MeterRow[] = rooms
      .filter((r) => values[r.id].w !== "" || values[r.id].e !== "")
      .map((r) => ({
        room_id: r.id,
        water_value: Number(values[r.id].w) || 0,
        electric_value: Number(values[r.id].e) || 0,
      }));
    const res = await saveMeterReadings(period, date, rows);
    setSaving(false);
    if (res?.error) setMsg("เกิดข้อผิดพลาด: " + res.error);
    else {
      setMsg(`บันทึกแล้ว ${rows.length} ห้อง`);
      router.refresh();
    }
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">วันที่จด:</label>
          <input
            type="date"
            className="field w-auto"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
          {msg && <span className="text-sm text-emerald-600">{msg}</span>}
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? "กำลังบันทึก…" : "💾 บันทึกค่ามิเตอร์"}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">ห้อง</th>
              <th className="px-3 py-3 font-medium">น้ำ (ก่อน)</th>
              <th className="px-3 py-3 font-medium">น้ำ (ปัจจุบัน)</th>
              <th className="px-3 py-3 font-medium">หน่วยน้ำ</th>
              <th className="px-3 py-3 font-medium">ไฟ (ก่อน)</th>
              <th className="px-3 py-3 font-medium">ไฟ (ปัจจุบัน)</th>
              <th className="px-3 py-3 font-medium">หน่วยไฟ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rooms.map((r) => {
              const w = values[r.id].w === "" ? null : Number(values[r.id].w);
              const e = values[r.id].e === "" ? null : Number(values[r.id].e);
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
                  <td className="px-3 py-2 text-slate-400">{r.prev_water ?? "-"}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.01"
                        className="field w-24"
                        value={values[r.id].w}
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
                  <td className="px-3 py-2 font-medium text-sky-600">{wu ?? "-"}</td>
                  <td className="px-3 py-2 text-slate-400">{r.prev_electric ?? "-"}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.01"
                        className="field w-24"
                        value={values[r.id].e}
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
                  <td className="px-3 py-2 font-medium text-amber-600">{eu ?? "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
