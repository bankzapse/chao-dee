/**
 * ตัวเชื่อมตรวจสลิปอัตโนมัติ (EasySlip / SlipOK) — ทำงานเมื่อมี env เท่านั้น
 *   SLIP_VERIFY_URL = https://developer.easyslip.com/api/v1/verify
 *   SLIP_VERIFY_KEY = API key (ใช้เป็น Bearer token)
 * ถ้าไม่ตั้งค่า จะข้าม (ให้เจ้าของระบบตรวจเอง)
 */

import Anthropic from "@anthropic-ai/sdk";

export function isSlipVerifyConfigured(): boolean {
  return Boolean(process.env.SLIP_VERIFY_URL && process.env.SLIP_VERIFY_KEY);
}

/** มีวิธีอ่านสลิปไหม — EasySlip (เช็คธนาคาร) หรือ AI-OCR (Claude) */
export function isSlipReadable(): boolean {
  return isSlipVerifyConfigured() || Boolean(process.env.ANTHROPIC_API_KEY);
}

export type SlipResult = {
  ok: boolean;
  amount?: number;
  transRef?: string;
  error?: string;
  method?: "bank" | "ai"; // อ่านด้วยอะไร (แจ้งเจ้าของให้ตรวจถ้าเป็น ai)
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

const SLIP_SCHEMA = {
  type: "object",
  properties: {
    amount: { type: "number", description: "ยอดเงินที่โอน (บาท) จากสลิป" },
    trans_ref: { type: "string", description: "เลขที่รายการ/อ้างอิง ถ้าเห็นบนสลิป มิฉะนั้นเว้นว่าง" },
    is_slip: { type: "boolean", description: "รูปนี้เป็นสลิปโอนเงินของธนาคารจริงหรือไม่" },
  },
  required: ["amount", "trans_ref", "is_slip"],
  additionalProperties: false,
} as const;

/**
 * อ่านยอดจากรูปสลิปด้วย Claude vision (ANTHROPIC_API_KEY) — ฟรีกว่า ไม่มีค่ารายเดือน
 * หมายเหตุ: อ่านจากภาพ ไม่ได้เช็คกับธนาคาร (สลิปตัดต่อ AI อาจอ่านตามภาพ)
 * ใช้คู่กับ semi-auto ที่เจ้าของดูสลิป + กดยืนยันเองเป็นด่านกันปลอม
 */
export async function readSlipWithAI(buffer: ArrayBuffer, contentType: string): Promise<SlipResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return { ok: false, error: "ยังไม่ได้ตั้งค่า ANTHROPIC_API_KEY" };
  try {
    const client = new Anthropic({ apiKey });
    const base64 = Buffer.from(buffer).toString("base64");
    const mediaType = contentType.includes("png") ? "image/png" : "image/jpeg";
    const message = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 512,
      output_config: { format: { type: "json_schema", schema: SLIP_SCHEMA } },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
            {
              type: "text",
              text: "นี่คือรูปสลิปโอนเงินของธนาคารไทย อ่าน 'ยอดเงินที่โอน' เป็นตัวเลข (บาท) และเลขที่รายการ/อ้างอิงถ้ามี ถ้ารูปนี้ไม่ใช่สลิปโอนเงินให้ is_slip เป็น false",
            },
          ],
        },
      ],
    });
    const textBlock = message.content.find((b) => b.type === "text");
    const raw = textBlock && "text" in textBlock ? textBlock.text : "{}";
    const parsed = JSON.parse(raw) as { amount: number; trans_ref: string; is_slip: boolean };
    if (!parsed.is_slip) return { ok: false, error: "รูปนี้ไม่ใช่สลิปโอนเงิน" };
    return {
      ok: true,
      amount: Number.isFinite(parsed.amount) ? parsed.amount : undefined,
      transRef: parsed.trans_ref || "",
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "อ่านสลิปด้วย AI ไม่สำเร็จ" };
  }
}

/**
 * อ่านสลิป (pluggable): EasySlip (เช็คธนาคารจริง) ก่อน ถ้าไม่ตั้งค่าใช้ AI-OCR (ฟรีกว่า)
 * เพิ่ม method บอกว่าอ่านด้วยอะไร เพื่อแจ้งเจ้าของให้ตรวจสลิปถ้าเป็น ai
 */
export async function readSlip(buffer: ArrayBuffer, contentType: string): Promise<SlipResult> {
  if (isSlipVerifyConfigured()) return { ...(await verifySlipImage(buffer, contentType)), method: "bank" };
  if (process.env.ANTHROPIC_API_KEY) return { ...(await readSlipWithAI(buffer, contentType)), method: "ai" };
  return { ok: false, error: "ยังไม่ได้ตั้งค่าการอ่านสลิป (EasySlip หรือ ANTHROPIC_API_KEY)" };
}
