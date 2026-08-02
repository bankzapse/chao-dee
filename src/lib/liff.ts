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

function secret(): string {
  // ใช้ channel secret ของ LINE เป็นกุญแจเซ็น (server-only อยู่แล้ว) จะได้ไม่ต้องตั้ง env ใหม่
  return process.env.LINE_CHANNEL_SECRET || process.env.CRON_SECRET || "";
}

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

export type LiffSession = { sub: string; tenantId: string | null; exp: number };

function sign(payload: LiffSession): string {
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  const mac = b64url(createHmac("sha256", secret()).update(body).digest());
  return `${body}.${mac}`;
}

function unsign(token: string): LiffSession | null {
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const body = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  const expected = b64url(createHmac("sha256", secret()).update(body).digest());
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(fromB64url(body).toString()) as LiffSession;
    if (!data.exp || data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
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
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "none", // LIFF เปิดใน webview ของ LINE = cross-site
    // path "/" เพราะทั้งหน้า /liff/* และ API /api/liff/* + หน้าบิล /bill/* ต้องอ่าน cookie นี้
    // (เดิม "/liff" ทำให้ /api/liff/link, /api/liff/maintenance, /bill ไม่ได้รับ cookie → เซสชันหลุด)
    path: "/",
    maxAge: MAX_AGE,
  });
  // ลบ cookie เก่า "liff_session" ที่ค้างจากเวอร์ชันก่อน (ทั้ง path เดิม "/liff" และ "/") ให้หมด
  const kill = { httpOnly: true, secure: true, sameSite: "none" as const, maxAge: 0 };
  jar.set(LEGACY_COOKIE, "", { ...kill, path: "/liff" });
  jar.set(LEGACY_COOKIE, "", { ...kill, path: "/" });
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
  const { data } = await admin
    .from("tenants")
    .select("id, org_id, full_name, phone, room_id, line_user_id")
    .eq("line_user_id", sess.sub)
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
