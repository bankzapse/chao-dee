import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyLineIdToken, setLiffSession } from "@/lib/liff";

export const runtime = "nodejs";

/**
 * แลก LINE ID token → เซสชันผู้เช่า
 * client (LIFF) เรียกตอนเปิดแอป ส่ง id_token มา เราตรวจกับ LINE แล้วออก cookie
 * คืน { linked } เพื่อให้หน้าเว็บรู้ว่าต้องพาไปหน้าผูกบัญชีหรือเข้าเมนูได้เลย
 */
export async function POST(req: Request) {
  const { idToken } = (await req.json().catch(() => ({}))) as { idToken?: string };
  const sub = await verifyLineIdToken(idToken ?? "");
  if (!sub) {
    return NextResponse.json({ error: "ตรวจสอบบัญชี LINE ไม่สำเร็จ" }, { status: 401 });
  }

  // ผู้เช่ารายนี้เคยผูก LINE ไว้แล้วหรือยัง
  const admin = createAdminClient();
  const { data: tenant } = await admin
    .from("tenants")
    .select("id")
    .eq("line_user_id", sub)
    .order("created_at", { ascending: false })
    .limit(1) // กัน crash ถ้ามีผู้เช่า >1 คนผูก LINE เดียวกัน
    .maybeSingle();

  await setLiffSession(sub, tenant?.id ?? null);
  return NextResponse.json({ linked: Boolean(tenant) });
}
