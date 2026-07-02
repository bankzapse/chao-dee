/**
 * SMS provider adapter — ส่งข้อความ SMS ผ่านผู้ให้บริการของคุณ
 *
 * ตั้งค่าใน .env.local / Vercel:
 *   SMS_API_URL   = endpoint ส่ง SMS ของ provider (เช่น https://api.provider.com/sms/send)
 *   SMS_API_KEY   = API key / token
 *   SMS_SENDER    = ชื่อผู้ส่ง (sender name) เช่น Chao-Dee
 *
 * ⚠️ รูปแบบ request (headers/body) ต่างกันตาม provider — ปรับใน buildRequest() ให้ตรงเอกสาร API ของคุณ
 */

export function isSmsConfigured(): boolean {
  return Boolean(process.env.SMS_API_URL && process.env.SMS_API_KEY);
}

function normalizeThaiPhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.startsWith("66")) return "0" + d.slice(2); // ผู้ให้บริการไทยส่วนใหญ่ใช้ 0xxxxxxxxx
  if (d.startsWith("0")) return d;
  return d;
}

export async function sendSms(
  phoneE164: string,
  message: string
): Promise<{ ok: boolean; error?: string }> {
  const url = process.env.SMS_API_URL;
  const key = process.env.SMS_API_KEY;
  const sender = process.env.SMS_SENDER ?? "Chao-Dee";
  if (!url || !key) return { ok: false, error: "SMS ยังไม่ได้ตั้งค่า (SMS_API_URL/SMS_API_KEY)" };

  const to = normalizeThaiPhone(phoneE164);

  // ---- ปรับส่วนนี้ให้ตรง API ของ provider ----
  // ค่าเริ่มต้น: POST JSON + Bearer token (รูปแบบที่พบบ่อยของ SMS gateway ไทย)
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ sender, msisdn: to, message, to, text: message }),
  });
  // -------------------------------------------

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    return { ok: false, error: `SMS ส่งไม่สำเร็จ (${res.status}) ${t.slice(0, 200)}` };
  }
  return { ok: true };
}
