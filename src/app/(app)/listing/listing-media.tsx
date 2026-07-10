"use client";

import { useRouter } from "next/navigation";
import { ModalButton } from "@/components/modal";
import { LocationPicker } from "./location-picker";

/** ปุ่มปักหมุดตำแหน่งบนแผนที่ (รูปภาพจัดการในฟอร์มลงประกาศแล้ว) */
export function ListingMediaButton({
  listingId,
  lat,
  lng,
}: {
  listingId: string;
  lat?: number | null;
  lng?: number | null;
}) {
  return (
    <ModalButton
      label={lat != null && lng != null ? "📍 แผนที่ ✓" : "📍 ปักหมุดแผนที่"}
      title="ปักหมุดตำแหน่ง"
      variant="secondary"
    >
      {() => <MapPanel listingId={listingId} lat={lat ?? null} lng={lng ?? null} />}
    </ModalButton>
  );
}

function MapPanel({
  listingId,
  lat,
  lng,
}: {
  listingId: string;
  lat: number | null;
  lng: number | null;
}) {
  const router = useRouter();
  return (
    <div>
      <p className="mb-2 text-sm text-slate-600">
        ปักหมุดตำแหน่งที่พัก เพื่อแสดงแผนที่ในหน้าประกาศ
      </p>
      <LocationPicker listingId={listingId} lat={lat} lng={lng} onSaved={() => router.refresh()} />
    </div>
  );
}
