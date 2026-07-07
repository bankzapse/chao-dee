import crypto from "crypto";

const LINE_API = "https://api.line.me/v2/bot";

export function lineToken(): string {
  return process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "";
}
export function lineSecret(): string {
  return process.env.LINE_CHANNEL_SECRET ?? "";
}
export function isLineConfigured(): boolean {
  return Boolean(lineToken() && lineSecret());
}

/** ตรวจลายเซ็น x-line-signature ของ webhook */
export function verifyLineSignature(rawBody: string, signature: string | null): boolean {
  if (!signature || !lineSecret()) return false;
  const hash = crypto
    .createHmac("sha256", lineSecret())
    .update(rawBody)
    .digest("base64");
  try {
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
  } catch {
    return false;
  }
}

export type LineMessage =
  | { type: "text"; text: string }
  | { type: "image"; originalContentUrl: string; previewImageUrl: string };

export function textMessage(text: string): LineMessage {
  return { type: "text", text };
}

export function imageMessage(url: string, previewUrl?: string): LineMessage {
  return { type: "image", originalContentUrl: url, previewImageUrl: previewUrl ?? url };
}

/** ดาวน์โหลดไฟล์แนบจากข้อความ LINE (เช่น รูปสลิป) — คืน Buffer + content-type */
export async function getLineContent(
  messageId: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  if (!lineToken()) return null;
  const res = await fetch(
    `https://api-data.line.me/v2/bot/message/${messageId}/content`,
    { headers: { Authorization: `Bearer ${lineToken()}` } }
  );
  if (!res.ok) return null;
  const contentType = res.headers.get("content-type") || "image/jpeg";
  const buffer = Buffer.from(await res.arrayBuffer());
  return { buffer, contentType };
}

async function lineFetch(path: string, body: unknown): Promise<{ ok: boolean; status: number; error?: string }> {
  if (!lineToken()) return { ok: false, status: 0, error: "LINE ยังไม่ได้ตั้งค่า" };
  const res = await fetch(`${LINE_API}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lineToken()}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    return { ok: false, status: res.status, error: t };
  }
  return { ok: true, status: res.status };
}

export function replyMessage(replyToken: string, messages: LineMessage[]) {
  return lineFetch("/message/reply", { replyToken, messages });
}

export function pushMessage(to: string, messages: LineMessage[]) {
  return lineFetch("/message/push", { to, messages });
}

export function broadcastMessage(messages: LineMessage[]) {
  return lineFetch("/message/broadcast", { messages });
}
