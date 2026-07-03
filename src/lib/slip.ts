/**
 * ตัวเชื่อมตรวจสลิปอัตโนมัติ (EasySlip / SlipOK) — ทำงานเมื่อมี env เท่านั้น
 *   SLIP_VERIFY_URL = https://developer.easyslip.com/api/v1/verify
 *   SLIP_VERIFY_KEY = API key (ใช้เป็น Bearer token)
 * ถ้าไม่ตั้งค่า จะข้าม (ให้เจ้าของระบบตรวจเอง)
 */

export function isSlipVerifyConfigured(): boolean {
  return Boolean(process.env.SLIP_VERIFY_URL && process.env.SLIP_VERIFY_KEY);
}

export type SlipResult = {
  ok: boolean;
  amount?: number;
  transRef?: string;
  error?: string;
};

/** ตรวจสลิปจากไฟล์ภาพ (best-effort) */
export async function verifySlipImage(buffer: ArrayBuffer, contentType: string): Promise<SlipResult> {
  const url = process.env.SLIP_VERIFY_URL?.trim();
  const key = process.env.SLIP_VERIFY_KEY?.trim();
  if (!url || !key) return { ok: false, error: "ยังไม่ได้ตั้งค่าการตรวจสลิป" };

  try {
    const form = new FormData();
    form.append("image", new Blob([buffer], { type: contentType || "image/jpeg" }), "slip.jpg");

    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) return { ok: false, error: `ตรวจสลิปไม่สำเร็จ (${res.status})` };

    // parse แบบยืดหยุ่น รองรับหลายรูปแบบ response
    const data = (json.data ?? json) as Record<string, unknown>;
    const amountField = data.amount as unknown;
    const amount =
      typeof amountField === "number"
        ? amountField
        : typeof amountField === "object" && amountField
          ? Number((amountField as Record<string, unknown>).amount ?? NaN)
          : Number((data.amount as string) ?? NaN);
    const transRef =
      (data.transRef as string) ?? (data.ref as string) ?? (data.transactionId as string) ?? "";

    return { ok: true, amount: Number.isFinite(amount) ? amount : undefined, transRef };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ตรวจสลิปผิดพลาด" };
  }
}
