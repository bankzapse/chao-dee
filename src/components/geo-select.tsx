"use client";

import { useEffect, useState } from "react";

async function fetchGeo(params: Record<string, string>): Promise<string[]> {
  const qs = new URLSearchParams(params).toString();
  try {
    const r = await fetch(`/api/geo?${qs}`);
    const j = await r.json();
    return (j.options as string[]) ?? [];
  } catch {
    return [];
  }
}

/** จังหวัด → อำเภอ/เขต แบบ dropdown (cascading) — ส่งค่าผ่าน name="province" / name="district" */
export function GeoSelect({
  province: p0,
  district: d0,
  required,
}: {
  province?: string;
  district?: string;
  required?: boolean;
}) {
  const [provinces, setProvinces] = useState<string[]>([]);
  const [province, setProvince] = useState(p0 ?? "");
  const [district, setDistrict] = useState(d0 ?? "");
  const [amphoes, setAmphoes] = useState<string[]>([]);

  useEffect(() => {
    fetchGeo({}).then(setProvinces);
    if (province) fetchGeo({ province }).then(setAmphoes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onProvince(v: string) {
    setProvince(v);
    setDistrict("");
    setAmphoes(v ? await fetchGeo({ province: v }) : []);
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="label">จังหวัด{required ? " *" : ""}</label>
        <select
          name="province"
          className="field"
          value={province}
          onChange={(e) => onProvince(e.target.value)}
          required={required}
        >
          <option value="">— เลือกจังหวัด —</option>
          {/* เผื่อค่าเดิมไม่อยู่ในลิสต์ (กันหลุด) */}
          {province && !provinces.includes(province) && <option value={province}>{province}</option>}
          {provinces.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">อำเภอ/เขต{required ? " *" : ""}</label>
        <select
          name="district"
          className="field"
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          required={required}
          disabled={!province}
        >
          <option value="">{province ? "— เลือกอำเภอ/เขต —" : "เลือกจังหวัดก่อน"}</option>
          {district && !amphoes.includes(district) && <option value={district}>{district}</option>}
          {amphoes.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
