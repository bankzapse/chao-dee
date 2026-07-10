"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ModalButton } from "@/components/modal";
import { Spinner } from "@/components/spinner";
import { createClient } from "@/lib/supabase/client";
import {
  listListingPhotos,
  addListingPhoto,
  deleteListingPhoto,
  setCoverPhoto,
  type PhotoView,
} from "./media-actions";
import { LocationPicker } from "./location-picker";

export function ListingMediaButton({
  listingId,
  count = 0,
  cover,
  lat,
  lng,
}: {
  listingId: string;
  count?: number;
  cover?: string;
  lat?: number | null;
  lng?: number | null;
}) {
  return (
    <ModalButton
      label={`🖼️ รูป & แผนที่${count > 0 ? ` (${count})` : ""}`}
      title="รูปภาพ & ตำแหน่ง"
      variant="secondary"
    >
      {() => (
        <MediaPanel listingId={listingId} cover={cover} lat={lat ?? null} lng={lng ?? null} />
      )}
    </ModalButton>
  );
}

function MediaPanel({
  listingId,
  cover,
  lat,
  lng,
}: {
  listingId: string;
  cover?: string;
  lat: number | null;
  lng: number | null;
}) {
  const router = useRouter();
  const [photos, setPhotos] = useState<PhotoView[] | null>(null);
  const [coverUrl, setCoverUrl] = useState<string>(cover ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    setPhotos(await listListingPhotos(listingId));
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const MAX_PHOTOS = 10;

  async function onFiles(files: FileList) {
    const current = photos?.length ?? 0;
    const remaining = MAX_PHOTOS - current;
    if (remaining <= 0) {
      setErr(`อัปโหลดได้สูงสุด ${MAX_PHOTOS} รูปต่อประกาศ`);
      return;
    }
    const picked = Array.from(files).slice(0, remaining);
    if (files.length > remaining) {
      setErr(`เพิ่มได้อีก ${remaining} รูป (สูงสุด ${MAX_PHOTOS} รูป) — อัปโหลดให้ ${remaining} รูปแรก`);
    }
    setBusy(true);
    if (files.length <= remaining) setErr("");
    try {
      const supabase = createClient();
      for (const file of picked) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `gallery/${listingId}/${crypto.randomUUID()}.${ext}`;
        const up = await supabase.storage.from("listings").upload(path, file);
        if (up.error) {
          setErr("อัปโหลดไม่สำเร็จ: " + up.error.message);
          continue;
        }
        const url = supabase.storage.from("listings").getPublicUrl(path).data.publicUrl;
        const res = await addListingPhoto(listingId, url);
        if (res.error) setErr(res.error);
      }
      await load();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("ลบรูปนี้?")) return;
    await deleteListingPhoto(id);
    await load();
    router.refresh();
  }

  async function makeCover(url: string) {
    setCoverUrl(url);
    await setCoverPhoto(listingId, url);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* ===== รูปภาพ ===== */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-slate-700">
            รูปภาพที่พัก <span className="text-xs font-normal text-slate-400">({photos?.length ?? 0}/{MAX_PHOTOS})</span>
          </p>
          <label className={`btn-secondary cursor-pointer text-sm ${(photos?.length ?? 0) >= MAX_PHOTOS ? "pointer-events-none opacity-50" : ""}`}>
            {busy ? "กำลังอัปโหลด…" : "+ เพิ่มรูป (เลือกได้หลายรูป)"}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={busy || (photos?.length ?? 0) >= MAX_PHOTOS}
              onChange={(e) => {
                if (e.target.files?.length) onFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        </div>
        {err && <p className="mb-2 text-sm text-rose-600">{err}</p>}

        {photos === null ? (
          <p className="text-sm text-slate-400">กำลังโหลด…</p>
        ) : photos.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm text-slate-400">
            ยังไม่มีรูป — เพิ่มรูปห้อง/อาคารเพื่อให้ประกาศน่าสนใจขึ้น
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p) => {
              const isCover = coverUrl === p.url;
              return (
                <div key={p.id} className="group relative overflow-hidden rounded-lg border border-slate-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="" className="h-24 w-full object-cover" />
                  {isCover && (
                    <span className="absolute left-1 top-1 rounded bg-indigo-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      ปก
                    </span>
                  )}
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/50 px-1.5 py-1 text-[11px] text-white opacity-0 transition group-hover:opacity-100">
                    {!isCover ? (
                      <button onClick={() => makeCover(p.url)} className="hover:text-amber-300">
                        ตั้งเป็นปก
                      </button>
                    ) : (
                      <span className="text-amber-300">รูปปก</span>
                    )}
                    <button onClick={() => remove(p.id)} className="hover:text-rose-300">
                      ลบ
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {busy && (
          <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
            <Spinner /> กำลังอัปโหลด…
          </p>
        )}
      </div>

      {/* ===== ตำแหน่งบนแผนที่ ===== */}
      <div className="border-t border-slate-100 pt-4">
        <p className="mb-2 text-sm font-medium text-slate-700">ปักหมุดตำแหน่ง (แสดงแผนที่ในหน้าประกาศ)</p>
        <LocationPicker listingId={listingId} lat={lat} lng={lng} onSaved={() => router.refresh()} />
      </div>
    </div>
  );
}
