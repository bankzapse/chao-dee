import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { readLiffSession, setLiffSession } from "@/lib/liff";
import { toLocalThai } from "@/lib/phone";

export const runtime = "nodejs";

/**
 * ผูกบัญชีผู้เช่ากับ LINE ด้วยเบอร์โทร
 *
 * ความปลอดภัย:
 * - ต้องมีเซสชันที่ตรวจ LINE token แล้ว (readLiffSession) — sub มาจาก LINE ไม่ใช่ client
 * - จับคู่เฉพาะเมื่อมีผู้เช่า "ที่ยังไม่ผูก LINE" ตรงเบอร์ "พอดี 1 คน" เท่านั้น
 *   ถ้าซ้ำหลายคน (พี่น้องใช้เบอร์เดียว) ไม่ผูกอัตโนมัติ ให้ติดต่อผู้ดูแล
 * - LINE userId หนึ่งผูกได้ที่เดียว กันเอาบัญชีเดียวไปผูกหลายห้อง
 */
export async function POST(req: Request) {
  const sess = await readLiffSession();
  if (!sess) return NextResponse.json({ error: "กรุณาเปิดผ่าน LINE อีกครั้ง" }, { status: 401 });

  const { phone } = (await req.json().catch(() => ({}))) as { phone?: string };
  const local = toLocalThai(String(phone ?? ""));
  if (!/^0\d{9}$/.test(local)) {
    return NextResponse.json({ error: "กรุณากรอกเบอร์โทร 10 หลักให้ถูกต้อง" }, { status: 400 });
  }

  const admin = createAdminClient();

  // LINE นี้ผูกกับผู้เช่าคนอื่นไปแล้วหรือยัง
  // limit(1) กัน crash: maybeSingle จะ throw ถ้าเผลอมี >1 แถวผูก sub เดียวกัน (ดู lib/liff.ts)
  const { data: already } = await admin
    .from("tenants")
    .select("id")
    .eq("line_user_id", sess.sub)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (already) {
    await setLiffSession(sess.sub, already.id);
    return NextResponse.json({ ok: true, tenantId: already.id });
  }

  const { data: matches } = await admin
    .from("tenants")
    .select("id, full_name")
    .eq("phone", local)
    .eq("line_user_id", "");

  if (!matches || matches.length === 0) {
    return NextResponse.json(
      { error: "ไม่พบผู้เช่าที่ใช้เบอร์นี้ หรือผูกบัญชีไปแล้ว — กรุณาติดต่อผู้ดูแลหอ" },
      { status: 404 }
    );
  }
  if (matches.length > 1) {
    return NextResponse.json(
      { error: "มีผู้เช่าหลายคนใช้เบอร์นี้ — กรุณาให้ผู้ดูแลหอเป็นคนผูกบัญชีให้" },
      { status: 409 }
    );
  }

  const tenant = matches[0];
  // ผูกแบบมีเงื่อนไข (line_user_id ยังว่าง) กันแข่งกันผูกพร้อมกัน
  const { data: linked, error } = await admin
    .from("tenants")
    .update({ line_user_id: sess.sub, line_link_code: "" })
    .eq("id", tenant.id)
    .eq("line_user_id", "")
    .select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!linked?.length) {
    return NextResponse.json({ error: "บัญชีนี้เพิ่งถูกผูกไปแล้ว กรุณาลองใหม่" }, { status: 409 });
  }

  // กัน LINE เดียวผูกหลายผู้เช่า (เช่น ลบ/สร้างใหม่แล้วมีตกค้าง) — เคลียร์ sub ออกจากคนอื่น
  await admin
    .from("tenants")
    .update({ line_user_id: "", line_link_code: "" })
    .eq("line_user_id", sess.sub)
    .neq("id", tenant.id);

  await setLiffSession(sess.sub, tenant.id);
  return NextResponse.json({ ok: true, tenantId: tenant.id, name: tenant.full_name });
}
