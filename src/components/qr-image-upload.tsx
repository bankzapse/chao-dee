"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cropQrFromImage } from "@/lib/crop-qr";

const MAX_BYTES = 3 * 1024 * 1024;

/**
 * อัปโหลดรูป QR รับเงินของบัญชีธนาคาร (ไม่บังคับ)
 *
 * มีไว้เพราะเลขบัญชีธนาคารแปลงเป็นคิวอาร์มาตรฐาน Thai QR ไม่ได้
 * แต่แอปธนาคารหลายเจ้าสร้างรูป QR รับเงินของบัญชีนั้นให้ได้ — เซฟรูปนั้นมาใส่ตรงนี้
 *
 * ส่งค่าออกเป็น hidden input ชื่อ `name` ให้ ActionForm ที่ครอบอยู่บันทึกต่อ
 */
export function QrImageUpload({
  name,
  value,
  onChange,
}: {
  name: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");

  async function upload(original: File) {
    setErr("");
    setNote("");
    if (!original.type.startsWith("image/")) {
      setErr("ไฟล์ต้องเป็นรูปภาพ (jpg / png)");
      return;
    }
    if (original.size > MAX_BYTES) {
      setErr("ไฟล์ใหญ่เกิน 3 MB — ลองย่อรูปก่อน");
      return;
    }
    setBusy(true);
    try {
      // ตัดเอาเฉพาะ QR ออกจากสกรีนช็อต — หาไม่เจอก็ใช้รูปเดิม
      let file = original;
      try {
        const cropped = await cropQrFromImage(original);
        if (cropped) file = cropped;
        else setNote("ไม่พบ QR ในรูป — อัปโหลดรูปเต็มให้แทน (ลองถ่าย/ครอปให้เห็น QR ชัดขึ้น)");
      } catch {
        setNote("ตัดรูปอัตโนมัติไม่สำเร็จ — อัปโหลดรูปเต็มให้แทน");
      }

      const supabase = createClient();
      const ext = file.name.split(".").pop() || "png";
      const path = `bank/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from("payment-qr").upload(path, file);
      if (up.error) {
        setErr(
          /bucket|not found/i.test(up.error.message)
            ? "ยังไม่ได้อัปเดตฐานข้อมูล (migration 0046) — กรุณารัน migration ก่อน"
            : "อัปโหลดไม่สำเร็จ: " + up.error.message
        );
        return;
      }
      onChange(supabase.storage.from("payment-qr").getPublicUrl(path).data.publicUrl);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <label className="label">รูป QR ของบัญชีธนาคาร (ไม่บังคับ)</label>
      <input type="hidden" name={name} value={value} />
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = "";
        }}
      />

      {value ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="QR บัญชีธนาคาร"
            className="h-24 w-24 rounded-lg object-contain ring-1 ring-slate-200"
          />
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              className="btn-secondary !py-1 text-xs"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              {busy ? "กำลังอัปโหลด…" : "เปลี่ยนรูป"}
            </button>
            <button
              type="button"
              className="text-xs font-medium text-rose-600 hover:text-rose-700"
              onClick={() => onChange("")}
            >
              เอารูปออก
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="btn-secondary"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? "กำลังตัดรูป…" : "📤 อัปโหลดรูป QR"}
        </button>
      )}

      {err && <p className="mt-1 text-xs text-rose-600">{err}</p>}
      {note && <p className="mt-1 text-xs text-amber-600">{note}</p>}
      <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
        เปิดแอปธนาคาร → เมนูรับเงิน/QR รับเงิน → บันทึกรูป แล้วนำมาอัปโหลดที่นี่
        <br />
        <b>อัปโหลดสกรีนช็อตทั้งหน้าจอได้เลย</b> ระบบจะตัดเอาเฉพาะส่วน QR ให้อัตโนมัติ
        <br />
        ถ้าไม่ใส่ ระบบจะแสดงเป็นเลขบัญชีให้คัดลอกไปโอนแทน
      </p>
    </div>
  );
}
