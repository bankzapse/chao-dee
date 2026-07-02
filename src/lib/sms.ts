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

const UA =
  "Mozilla/5.0 (compatible; ChaoDee/1.0; +https://chao-dee.com)";

export function isSmsConfigured(): boolean {
  return Boolean(process.env.SMS_API_URL && process.env.SMS_API_KEY);
}

function normalizeThaiPhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.startsWith("66")) return "0" + d.slice(2); // 66xxxxxxxxx → 0xxxxxxxxx
  if (d.startsWith("0")) return d;
  return d;
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
  const sender = (process.env.SMS_SENDER ?? "Chao-Dee").trim();
  if (!url || !key) return { ok: false, error: "SMS ยังไม่ได้ตั้งค่า (SMS_API_URL/SMS_API_KEY)" };

  const to = normalizeThaiPhone(phone);
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
