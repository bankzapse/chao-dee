"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { buildPromptPayPayload } from "@/lib/promptpay";

export function PromptPayQR({
  promptpayId,
  amount,
  size = 200,
}: {
  promptpayId: string;
  amount?: number;
  size?: number;
}) {
  const [src, setSrc] = useState<string>("");

  useEffect(() => {
    if (!promptpayId) return;
    const payload = buildPromptPayPayload(promptpayId, amount);
    // เรนเดอร์ที่ความละเอียด 2 เท่า (retina) แต่แสดงผลที่ size เดิม → คมชัดบนจอ DPR สูง สแกนง่ายขึ้น
    QRCode.toDataURL(payload, { margin: 1, width: size * 2 })
      .then(setSrc)
      .catch(() => setSrc(""));
  }, [promptpayId, amount, size]);

  if (!promptpayId) {
    return (
      <p className="text-sm text-slate-400">
        ยังไม่ได้ตั้งค่า PromptPay (ไปที่หน้าตั้งค่า)
      </p>
    );
  }

  return (
    <div className="inline-flex flex-col items-center gap-1">
      <div className="rounded-lg bg-white p-2 ring-1 ring-slate-200">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="PromptPay QR" width={size} height={size} />
        ) : (
          <div style={{ width: size, height: size }} className="animate-pulse bg-slate-100" />
        )}
      </div>
      <p className="text-xs font-medium text-slate-500">พร้อมเพย์ / PromptPay</p>
    </div>
  );
}
