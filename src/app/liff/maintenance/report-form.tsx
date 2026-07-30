"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

/** ฟอร์มแจ้งซ่อม + แนบรูป (ถ่าย/เลือกจากเครื่อง) */
export function ReportForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function pickPhoto(f: File) {
    if (!f.type.startsWith("image/")) {
      setErr("ไฟล์ต้องเป็นรูปภาพ");
      return;
    }
    setErr("");
    setPreview(URL.createObjectURL(f));
  }

  async function submit() {
    if (!title.trim()) {
      setErr("กรุณาระบุเรื่องที่แจ้งซ่อม");
      return;
    }
    setErr("");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("title", title);
      fd.set("description", description);
      const f = fileRef.current?.files?.[0];
      if (f) fd.set("photo", f);
      const res = await fetch("/api/liff/maintenance", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) {
        setErr(json.error ?? "แจ้งซ่อมไม่สำเร็จ");
        return;
      }
      setTitle("");
      setDescription("");
      setPreview("");
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch {
      setErr("เชื่อมต่อไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <p className="mb-3 font-semibold text-slate-900">แจ้งซ่อมใหม่</p>
      <input
        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
        placeholder="เรื่องที่แจ้ง เช่น แอร์ไม่เย็น"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
        rows={3}
        placeholder="รายละเอียดเพิ่มเติม (ไม่บังคับ)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) pickPhoto(f);
        }}
      />
      {preview ? (
        <div className="mt-2 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="รูปแนบ" className="h-20 w-20 rounded-lg object-cover ring-1 ring-slate-200" />
          <button
            type="button"
            className="text-xs font-medium text-rose-600"
            onClick={() => {
              setPreview("");
              if (fileRef.current) fileRef.current.value = "";
            }}
          >
            เอารูปออก
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="mt-2 w-full rounded-xl border border-dashed border-slate-300 py-2.5 text-sm text-slate-500 active:scale-95"
          onClick={() => fileRef.current?.click()}
        >
          📷 ถ่าย / แนบรูป (ไม่บังคับ)
        </button>
      )}

      {err && <p className="mt-2 text-sm text-rose-600">{err}</p>}
      <button
        onClick={submit}
        disabled={busy}
        className="mt-3 w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white active:scale-95 disabled:opacity-50"
      >
        {busy ? "กำลังส่ง…" : "ส่งแจ้งซ่อม"}
      </button>
    </div>
  );
}
