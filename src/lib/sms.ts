/**
 * SMS provider adapter — SMSOK (api.smsok.co)
 *
 * ตั้งค่าใน Vercel / .env.local:
 *   SMS_API_URL = https://api.smsok.co   (หรือ https://api.smsok.co/s ก็ได้)
 *   SMS_API_KEY = API key จาก smsok.co (ใช้เป็น username ของ HTTP Basic auth)
 *   SMS_SENDER  = ชื่อผู้ส่งที่อนุมัติแล้ว เช่น Chao-Dee
 *
 * สเปค SMSOK: POST /s · Basic auth (base64("KEY:")) · body { sender, text, destinations:[...] }
 * ต้องส่ง User-Agent ด้วย ไม่งั้น Cloudflare บล็อก (error 1010)
 */

import { toLocalThai } from "@/lib/phone";

const UA =
  "Mozilla/5.0 (compatible; Chao-Dee/1.0; +https://chao-dee.com)";

export function isSmsConfigured(): boolean {
  // ต้องมี sender ที่อนุมัติแล้วด้วย (fail-closed) — ไม่ตั้ง = ถือว่ายังไม่พร้อมส่ง
  return Boolean(process.env.SMS_API_URL && process.env.SMS_API_KEY && process.env.SMS_SENDER);
}

function endpoint(base: string): string {
  const b = base.replace(/\/+$/, "");
  return b.endsWith("/s") ? b : b + "/s";
}

export async function sendSms(
  phone: string,
  message: string
): Promise<{ ok: boolean; error?: string }> {
  // .trim() กันช่องว่าง/newline ที่ติดมาตอน paste ใน env (ทำให้ auth 401)
  const url = process.env.SMS_API_URL?.trim();
  const key = process.env.SMS_API_KEY?.trim();
  // ผู้ส่งต้องตั้งผ่าน env SMS_SENDER (ชื่อที่อนุมัติแล้ว) — fail-closed: ไม่ตั้ง = ไม่ส่ง
  // (เลิก hardcode/hack ค่าเก่า "MindFull" ที่เป็นแผลจากตอนตั้ง sender ผิดแบรนด์)
  const sender = process.env.SMS_SENDER?.trim();
  if (!url || !key || !sender) {
    return { ok: false, error: "SMS ยังไม่ได้ตั้งค่า (SMS_API_URL/SMS_API_KEY/SMS_SENDER)" };
  }

  const to = toLocalThai(phone);
  const auth = "Basic " + Buffer.from(`${key}:`).toString("base64");

  const res = await fetch(endpoint(url), {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": UA,
    },
    body: JSON.stringify({
      sender,
      text: message,
      destinations: [{ destination: to }], // SMSOK: array ของ object, เบอร์ไทย 0xxxxxxxxx
    }),
  });

  if (!res.ok) {
    let detail = "";
    try {
      const j = await res.json();
      detail = j?.error?.description || j?.error?.name || "";
    } catch {
      detail = (await res.text().catch(() => "")).slice(0, 150);
    }
    return { ok: false, error: `SMSOK ${res.status}: ${detail}` };
  }
  return { ok: true };
}
