"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useRef, useState } from "react";
import { Spinner } from "@/components/spinner";
import { setListingLocation } from "./media-actions";

declare global {
  interface Window {
    L?: any;
  }
}

let leafletPromise: Promise<any> | null = null;
function loadLeaflet(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    const s = document.createElement("script");
    s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    s.async = true;
    s.onload = () => resolve(window.L);
    s.onerror = () => reject(new Error("โหลดแผนที่ไม่สำเร็จ"));
    document.body.appendChild(s);
  });
  return leafletPromise;
}

export function LocationPicker({
  listingId,
  lat,
  lng,
  onSaved,
}: {
  listingId: string;
  lat: number | null;
  lng: number | null;
  onSaved?: () => void;
}) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(
    lat != null && lng != null ? { lat, lng } : null
  );
  const [search, setSearch] = useState("");
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);
  const [msg, setMsg] = useState<{ ok?: boolean; text: string } | null>(null);

  useEffect(() => {
    let map: any;
    let cancelled = false;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !mapEl.current) return;
        // ไอคอนหมุดจาก CDN (กันหมุดหาย)
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        });
        const start = pos ?? { lat: 13.7563, lng: 100.5018 }; // กรุงเทพฯ
        map = L.map(mapEl.current).setView([start.lat, start.lng], pos ? 15 : 11);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: "© OpenStreetMap",
        }).addTo(map);
        if (pos) markerRef.current = L.marker([pos.lat, pos.lng]).addTo(map);
        map.on("click", (e: any) => place(L, map, e.latlng.lat, e.latlng.lng));
        mapRef.current = map;
        setReady(true);
        setTimeout(() => map.invalidateSize(), 150);
      })
      .catch((e) => setMsg({ text: e.message || "โหลดแผนที่ไม่สำเร็จ" }));
    return () => {
      cancelled = true;
      if (map) map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function place(L: any, map: any, la: number, ln: number) {
    setPos({ lat: la, lng: ln });
    if (markerRef.current) markerRef.current.setLatLng([la, ln]);
    else markerRef.current = L.marker([la, ln]).addTo(map);
  }

  async function doSearch() {
    if (!search.trim()) return;
    setSearching(true);
    setMsg(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
          search + " ประเทศไทย"
        )}`,
        { headers: { "Accept-Language": "th" } }
      );
      const j = await res.json();
      if (j?.[0]) {
        const la = parseFloat(j[0].lat);
        const ln = parseFloat(j[0].lon);
        const map = mapRef.current;
        map.setView([la, ln], 15);
        place(window.L, map, la, ln);
      } else {
        setMsg({ text: "ไม่พบสถานที่ ลองพิมพ์ให้ละเอียดขึ้น หรือคลิกบนแผนที่" });
      }
    } catch {
      setMsg({ text: "ค้นหาไม่สำเร็จ ลองคลิกบนแผนที่แทน" });
    } finally {
      setSearching(false);
    }
  }

  async function save() {
    if (!pos) {
      setMsg({ text: "กรุณาปักหมุดบนแผนที่ก่อน" });
      return;
    }
    setSaving(true);
    setMsg(null);
    const res = await setListingLocation(listingId, pos.lat, pos.lng);
    setSaving(false);
    if (res.error) setMsg({ text: res.error });
    else {
      setMsg({ ok: true, text: "บันทึกตำแหน่งแล้ว ✓" });
      onSaved?.();
    }
  }

  return (
    <div>
      <div className="mb-2 flex gap-2">
        <input
          className="field flex-1"
          placeholder="ค้นหาสถานที่ เช่น MRT ห้วยขวาง"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              doSearch();
            }
          }}
        />
        <button type="button" onClick={doSearch} disabled={searching} className="btn-secondary whitespace-nowrap">
          {searching ? "…" : "ค้นหา"}
        </button>
      </div>
      <div ref={mapEl} className="h-64 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
        {!ready && <div className="flex h-full items-center justify-center text-sm text-slate-400">กำลังโหลดแผนที่…</div>}
      </div>
      <p className="mt-1 text-xs text-slate-400">คลิกบนแผนที่เพื่อปักหมุด หรือค้นหาสถานที่ด้านบน</p>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-slate-500">
          {pos ? `พิกัด: ${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}` : "ยังไม่ได้ปักหมุด"}
        </span>
        <button
          type="button"
          onClick={save}
          disabled={saving || !pos}
          className="btn-primary inline-flex items-center gap-2"
        >
          {saving && <Spinner />}
          บันทึกตำแหน่ง
        </button>
      </div>
      {msg && (
        <p className={`mt-2 text-sm ${msg.ok ? "text-emerald-600" : "text-rose-600"}`}>{msg.text}</p>
      )}
    </div>
  );
}
