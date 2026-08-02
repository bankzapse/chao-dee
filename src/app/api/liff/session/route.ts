import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyLineIdToken, setLiffSession, liffSessionCookieSpecs } from "@/lib/liff";

export const runtime = "nodejs";

/**
 * แลก LINE ID token → เซสชันผู้เช่า
 *
 * รองรับ 2 แบบ:
 * - form POST (แนะนำ): ตอบเป็น redirect 303 → คุกกี้ถูก set บน "navigation response"
 *   ซึ่งเก็บได้ชัวร์ใน iOS WKWebView (ต่างจากคุกกี้ที่ตั้งผ่าน fetch/XHR ที่มักถูกบล็อก)
 * - JSON POST (เดิม): ตอบ { linked } — เผื่อ client เก่า
 */
async function resolve(req: Request) {
  const ct = req.headers.get("content-type") ?? "";
  const isForm = ct.includes("form");
  let idToken = "";
  if (isForm) {
    const fd = await req.formData().catch(() => null);
    idToken = String(fd?.get("idToken") ?? "");
  } else {
    const body = ((await req.json().catch(() => ({}))) as { idToken?: string }) ?? {};
    idToken = body.idToken ?? "";
  }
  return { isForm, idToken };
}

export async function POST(req: Request) {
  const { isForm, idToken } = await resolve(req);
  const sub = await verifyLineIdToken(idToken);

  if (!sub) {
    if (isForm) return NextResponse.redirect(new URL("/liff/link?s=1", req.url), 303);
    return NextResponse.json({ error: "ตรวจสอบบัญชี LINE ไม่สำเร็จ" }, { status: 401 });
  }

  // ผู้เช่ารายนี้เคยผูก LINE ไว้แล้วหรือยัง (limit 1 กัน crash ถ้าเผลอผูกซ้ำ)
  const admin = createAdminClient();
  const { data: tenant } = await admin
    .from("tenants")
    .select("id")
    .eq("line_user_id", sub)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (isForm) {
    // ผูกแล้ว → เมนู, ยังไม่ผูก → หน้าผูกผ่านแชท · set cookie บน redirect โดยตรง (ชัวร์สุด)
    // เติม ?s=1 = ธงว่า "แลก session แล้ว" → ถ้าคุกกี้ไม่ติด LiffBoot จะไม่วนแลกซ้ำ
    const dest = tenant ? "/liff?s=1" : "/liff/link?s=1";
    const res = NextResponse.redirect(new URL(dest, req.url), 303);
    for (const c of liffSessionCookieSpecs(sub, tenant?.id ?? null)) res.cookies.set(c.name, c.value, c.options);
    return res;
  }
  await setLiffSession(sub, tenant?.id ?? null);
  return NextResponse.json({ linked: Boolean(tenant) });
}
