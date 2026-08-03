import "server-only";
import { cache } from "react";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * เซสชันผู้เช่าใน LINE LIFF
 *
 * หลักความปลอดภัย: ต้อง "ตรวจ ID token ฝั่ง server" กับ LINE เสมอ
 * ห้ามเชื่อ userId ที่ client ส่งมาตรงๆ (ปลอมได้ → ดูข้อมูลผู้เช่าคนอื่น)
 * เมื่อตรวจผ่านแล้วเราออก cookie ที่เซ็นด้วย HMAC เอง เพื่อไม่ต้องยิง LINE ทุกครั้ง
 * และ cookie นี้ปลอม/แก้ไม่ได้เพราะไม่รู้ secret ฝั่ง server
 */

// ชื่อใหม่ (v2) — เปลี่ยนจาก "liff_session" เพื่อให้ cookie เก่าที่ path="/liff" ถูกมองข้าม
// เครื่องที่ค้าง cookie เก่าจะไม่มี session ที่อ่านได้ → LiffInit รันใหม่ → ออก cookie ใหม่ path="/" ที่ถูกต้อง
const COOKIE = "liff_sess";
const LEGACY_COOKIE = "liff_session";
const MAX_AGE = 60 * 60 * 12; // 12 ชม.

// กุญแจ "เซ็น" session ของ LIFF — ใช้ env เฉพาะทาง LIFF_SESSION_SECRET เท่านั้น
// (ห้ามใช้ CRON_SECRET ซึ่งเป็น bearer ของ cron endpoint = เปิดเผยกว่า, และห้าม fallback "" = ปลอม cookie ได้)
// ไม่ตั้ง = ปฏิเสธออก/อ่าน session (fail-closed แบบเดียวกับ lib/line.ts)
function signingSecret(): string {
  return (process.env.LIFF_SESSION_SECRET || "").trim();
}
// กุญแจที่ยอมรับตอน "อ่าน" cookie — ใช้ LIFF_SESSION_SECRET อย่างเดียว
// (เลิก dual-verify ช่วงเปลี่ยนผ่านแล้ว: cookie เก่าที่เซ็นด้วย secret อื่นหมดอายุ MAX_AGE 12 ชม.
//  ตั้งแต่ deploy 2026-08-03 — ผู้เช่าที่เปิด /liff หลังจากนั้นได้ cookie ที่เซ็นด้วยกุญแจนี้แล้ว)
function verifySecrets(): string[] {
  return [signingSecret()].filter(Boolean);
}

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

export type LiffSession = { sub: string; tenantId: string | null; exp: number };

function sign(payload: LiffSession): string | null {
  const key = signingSecret();
  if (!key) return null; // fail-closed: ไม่มี LIFF_SESSION_SECRET → ไม่ออก session
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  const mac = b64url(createHmac("sha256", key).update(body).digest());
  return `${body}.${mac}`;
}

function unsign(token: string): LiffSession | null {
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const body = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  const a = Buffer.from(mac);
  // dual-verify: ยอมรับกุญแจใหม่ "หรือ" กุญแจเก่า (ช่วงเปลี่ยนผ่าน) · ไม่มีกุญแจเลย = ปฏิเสธ (fail-closed)
  for (const key of verifySecrets()) {
    const b = Buffer.from(b64url(createHmac("sha256", key).update(body).digest()));
    if (a.length === b.length && timingSafeEqual(a, b)) {
      try {
        const data = JSON.parse(fromB64url(body).toString()) as LiffSession;
        if (!data.exp || data.exp < Date.now()) return null;
        return data;
      } catch {
        return null;
      }
    }
  }
  return null;
}

/**
 * ตรวจ ID token กับ LINE แล้วคืน userId (sub)
 * client_id ต้องตรงกับ LINE Login channel ที่ LIFF สังกัด ไม่งั้น token ปลอมจากแอปอื่นผ่านได้
 */
export async function verifyLineIdToken(idToken: string): Promise<string | null> {
  const clientId = process.env.LINE_LOGIN_CHANNEL_ID || "";
  if (!idToken || !clientId) return null;
  try {
    const res = await fetch("https://api.line.me/oauth2/v2.1/verify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ id_token: idToken, client_id: clientId }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { sub?: string; aud?: string };
    if (!data.sub || data.aud !== clientId) return null;
    return data.sub;
  } catch {
    return null;
  }
}

/** ออก cookie เซสชันหลังตรวจ token ผ่าน (tenantId = null ถ้ายังไม่ผูกบัญชี) */
export async function setLiffSession(sub: string, tenantId: string | null): Promise<void> {
  const token = sign({ sub, tenantId, exp: Date.now() + MAX_AGE * 1000 });
  if (!token) return; // fail-closed: ไม่มี LIFF_SESSION_SECRET → ไม่ออก cookie
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: true,
    // Lax (ไม่ใช่ None): หน้า LIFF เป็น top-level document ใน LINE webview (ไม่ใช่ iframe)
    // → นับเป็น first-party จึงส่ง cookie ครบทุก navigation และ "เก็บได้ชัวร์" ใน iOS WKWebView
    // (SameSite=None ที่ตั้งผ่าน fetch มักถูก ITP บล็อก → session อ่านไม่ติด → LIFF วน loop)
    sameSite: "lax",
    // path "/" เพราะทั้งหน้า /liff/* และ API /api/liff/* + หน้าบิล /bill/* ต้องอ่าน cookie นี้
    path: "/",
    maxAge: MAX_AGE,
  });
  // ลบ cookie เก่า "liff_session" ที่ค้างจากเวอร์ชันก่อน (ทั้ง path เดิม "/liff" และ "/") ให้หมด
  const kill = { httpOnly: true, secure: true, sameSite: "none" as const, maxAge: 0 };
  jar.set(LEGACY_COOKIE, "", { ...kill, path: "/liff" });
  jar.set(LEGACY_COOKIE, "", { ...kill, path: "/" });
}

/** สเปกคุกกี้เซสชัน (ไว้ set บน NextResponse โดยตรง เช่น redirect ของ route handler) */
export function liffSessionCookieSpecs(sub: string, tenantId: string | null) {
  const base = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" };
  // ล้าง cookie เก่าเวอร์ชันก่อนเสมอ
  const specs = [
    { name: LEGACY_COOKIE, value: "", options: { ...base, path: "/liff", maxAge: 0 } },
    { name: LEGACY_COOKIE, value: "", options: { ...base, maxAge: 0 } },
  ];
  const token = sign({ sub, tenantId, exp: Date.now() + MAX_AGE * 1000 });
  // fail-closed: ไม่มี LIFF_SESSION_SECRET → ไม่ตั้ง session cookie
  if (token) specs.unshift({ name: COOKIE, value: token, options: { ...base, maxAge: MAX_AGE } });
  return specs;
}

export async function readLiffSession(): Promise<LiffSession | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  return token ? unsign(token) : null;
}

/** โหลดข้อมูลผู้เช่าจากเซสชัน (คืน null ถ้าไม่ล็อกอิน/ยังไม่ผูก/ผู้เช่าถูกลบ)
 *  ห่อด้วย cache() → ถ้าหลายที่ในเรนเดอร์เดียวเรียก จะ query DB แค่ครั้งเดียว */
export const getLiffTenant = cache(async () => {
  const sess = await readLiffSession();
  if (!sess) return null;
  const admin = createAdminClient();
  // หาจาก sub (LINE id ที่ตรวจแล้ว) โดยตรงเสมอ — ไม่พึ่ง tenantId ที่ cache ใน cookie
  // เพราะถ้าผูกบัญชีผ่านแชท (webhook) หลังเปิด LIFF ไปแล้ว tenantId ใน cookie จะ stale
  // แต่ line_user_id ใน DB คือแหล่งจริง เทียบกับ sub ได้ตรงทุกเคส
  // limit(1) กัน crash: ถ้าเผลอมีผู้เช่า >1 คนผูก LINE เดียวกัน (เช่น ลบ/สร้างใหม่แล้วผูกซ้ำ)
  // maybeSingle จะ throw ทำให้ "ทุกหน้า LIFF" พังเป็น Error — เลือกคนล่าสุดแทน
  const { data } = await admin
    .from("tenants")
    .select("id, org_id, full_name, phone, room_id, line_user_id")
    .eq("line_user_id", sess.sub)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return data as {
    id: string;
    org_id: string;
    full_name: string;
    phone: string;
    room_id: string | null;
    line_user_id: string;
  };
});
