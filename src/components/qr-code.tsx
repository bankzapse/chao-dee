"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/** QR โค้ดจากข้อความ/ลิงก์ใด ๆ (สร้างฝั่ง client) */
export function QRCodeImg({ text, size = 200 }: { text: string; size?: number }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    if (!text) return;
    QRCode.toDataURL(text, { margin: 1, width: size })
      .then(setSrc)
      .catch(() => setSrc(""));
  }, [text, size]);

  if (!text) return null;
  return (
    <div className="inline-block rounded-lg bg-white p-2 ring-1 ring-slate-200">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="QR" width={size} height={size} />
      ) : (
        <div style={{ width: size, height: size }} className="animate-pulse bg-slate-100" />
      )}
    </div>
  );
}

export function PrintButton({ label = "🖨️ พิมพ์" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="btn-primary no-print">
      {label}
    </button>
  );
}
