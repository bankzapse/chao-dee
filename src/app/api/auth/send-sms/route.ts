import { NextResponse } from "next/server";
import crypto from "crypto";
import { sendSms } from "@/lib/sms";

export const runtime = "nodejs";

/**
 * Supabase "Send SMS" Auth Hook
 * Supabase สร้าง OTP เอง แล้ว POST มาที่นี่ให้เราส่ง SMS ผ่าน provider
 * ตรวจลายเซ็นแบบ Standard Webhooks ด้วย SEND_SMS_HOOK_SECRET
 */

function verifyStandardWebhook(
  rawBody: string,
  headers: Headers,
  secret: string
): boolean {
  const id = headers.get("webhook-id");
  const timestamp = headers.get("webhook-timestamp");
  const sigHeader = headers.get("webhook-signature");
  if (!id || !timestamp || !sigHeader) return false;

  // secret รูปแบบ "v1,whsec_BASE64" หรือ "whsec_BASE64"
  const base64Secret = secret.replace(/^v1,/, "").replace(/^whsec_/, "");
  const key = Buffer.from(base64Secret, "base64");
  const signedContent = `${id}.${timestamp}.${rawBody}`;
  const expected = crypto.createHmac("sha256", key).update(signedContent).digest("base64");

  // header เป็นรายการ "v1,<sig> v1,<sig>" คั่นด้วยช่องว่าง
  return sigHeader.split(" ").some((part) => {
    const sig = part.split(",")[1] ?? part;
    try {
      return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    } catch {
      return false;
    }
  });
}

export async function POST(req: Request) {
  const secret = process.env.SEND_SMS_HOOK_SECRET?.trim();
  const raw = await req.text();

  if (!secret || !verifyStandardWebhook(raw, req.headers, secret)) {
    return NextResponse.json({ error: { message: "invalid signature" } }, { status: 401 });
  }

  let payload: { user?: { phone?: string }; sms?: { otp?: string } };
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: { message: "bad payload" } }, { status: 400 });
  }

  const phone = payload.user?.phone;
  const otp = payload.sms?.otp;
  if (!phone || !otp) {
    return NextResponse.json({ error: { message: "missing phone/otp" } }, { status: 400 });
  }

  const message = `รหัส OTP เข้าใช้งาน Chao-Dee: ${otp}\nใช้ได้ภายใน 5 นาที ห้ามบอกผู้อื่น`;
  const res = await sendSms(phone, message);

  if (!res.ok) {
    return NextResponse.json({ error: { message: res.error ?? "send failed" } }, { status: 500 });
  }
  return NextResponse.json({});
}
