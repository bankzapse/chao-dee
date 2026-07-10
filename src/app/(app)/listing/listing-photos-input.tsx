"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/spinner";
import { listListingPhotos } from "./media-actions";

const MAX = 10;

/** อัปโหลดรูปหลายรูป (สูงสุด 10) ในฟอร์มลงประกาศ — ส่งค่าเป็น cover_image + photo_urls (JSON) */
export function ListingPhotosInput({
  listingId,
  initialCover,
}: {
  listingId?: string;
  initialCover?: string;
}) {
  const [urls, setUrls] = useState<string[]>([]);
  const [cover, setCover] = useState<string>(initialCover ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  // create = พร้อมทันที · edit = พร้อมหลังดึงรูปเดิมเสร็จ (กันเซฟก่อนโหลดแล้วรูปหาย)
  const [ready, setReady] = useState(!listingId);

  // แก้ไข: ดึงรูปเดิมมาแสดง
  useEffect(() => {
    if (!listingId) return;
    listListingPhotos(listingId).then((ps) => {
      const u = ps.map((p) => p.url);
      setUrls(u);
      setCover((prev) => prev || u[0] || "");
      setReady(true);
    });
  }, [listingId]);

  async function onFiles(files: FileList) {
    const remaining = MAX - urls.length;
    if (remaining <= 0) {
      setErr(`อัปโหลดได้สูงสุด ${MAX} รูป`);
      return;
    }
    if (files.length > remaining) setErr(`เพิ่มได้อีก ${remaining} รูป (สูงสุด ${MAX})`);
    setBusy(true);
    try {
      const supabase = createClient();
      const added: string[] = [];
      for (const f of Array.from(files).slice(0, remaining)) {
        const ext = f.name.split(".").pop() || "jpg";
        const path = `gallery/${crypto.randomUUID()}.${ext}`;
        const up = await supabase.storage.from("listings").upload(path, f);
        if (up.error) {
          setErr("อัปโหลดไม่สำเร็จ: " + up.error.message);
          continue;
        }
        added.push(supabase.storage.from("listings").getPublicUrl(path).data.publicUrl);
      }
      setUrls((prev) => {
        const next = [...prev, ...added];
        if (!cover && next[0]) setCover(next[0]);
        return next;
      });
      if (files.length <= remaining) setErr("");
    } finally {
      setBusy(false);
    }
  }

  function remove(u: string) {
    setUrls((prev) => {
      const next = prev.filter((x) => x !== u);
      if (cover === u) setCover(next[0] ?? "");
      return next;
    });
  }

  return (
    <div>
      <input type="hidden" name="cover_image" value={cover} />
      <input type="hidden" name="photo_urls" value={JSON.stringify(urls)} />
      <input type="hidden" name="photos_ready" value={ready ? "1" : "0"} />
      <label className="label">
        รูปภาพ <span className="text-xs font-normal text-slate-400">({urls.length}/{MAX}) — รูปแรกหรือที่ตั้งเป็นปกจะเป็นรูปหน้าปก</span>
      </label>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {urls.map((u) => (
          <div key={u} className="group relative overflow-hidden rounded-lg border border-slate-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt="" className="h-20 w-full object-cover" />
            {cover === u && (
              <span className="absolute left-1 top-1 rounded bg-indigo-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
                ปก
              </span>
            )}
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/50 px-1.5 py-1 text-[11px] text-white opacity-0 transition group-hover:opacity-100">
              {cover !== u ? (
                <button type="button" onClick={() => setCover(u)} className="hover:text-amber-300">
                  ตั้งเป็นปก
                </button>
              ) : (
                <span className="text-amber-300">รูปปก</span>
              )}
              <button type="button" onClick={() => remove(u)} className="hover:text-rose-300">
                ลบ
              </button>
            </div>
          </div>
        ))}
        {urls.length < MAX && (
          <label className="flex h-20 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 text-xs text-slate-500 hover:border-indigo-300 hover:bg-indigo-50">
            {busy ? <Spinner /> : <span className="text-lg leading-none">+</span>}
            <span>{busy ? "อัปโหลด…" : "เพิ่มรูป"}</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                if (e.target.files?.length) onFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>
      {err && <p className="mt-1 text-sm text-rose-600">{err}</p>}
    </div>
  );
}
