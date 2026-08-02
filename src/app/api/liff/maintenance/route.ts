import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLiffTenant } from "@/lib/liff";
import { pushMessage, textMessage } from "@/lib/line";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024;
const OK_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

/**
 * ผู้เช่าแจ้งซ่อมผ่าน LIFF (แนบรูปได้)
 *
 * ทุกค่าที่เขียนลง DB มาจากเซสชันที่ตรวจ LINE token แล้ว (org_id/room_id/tenant_id)
 * ไม่รับจาก client — client ส่งได้แค่หัวข้อ/รายละเอียด/รูป
 * อัปโหลดผ่าน service-role เพราะผู้เช่าไม่มี Supabase session
 */
export async function POST(req: Request) {
  const tenant = await getLiffTenant();
  if (!tenant) {
    return NextResponse.json({ error: "กรุณาเปิดผ่าน LINE อีกครั้ง" }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });

  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  if (!title) return NextResponse.json({ error: "กรุณาระบุเรื่องที่แจ้งซ่อม" }, { status: 400 });

  const admin = createAdminClient();

  // ห้องของผู้เช่า: ใช้ tenants.room_id ก่อน ถ้าว่างค่อย fallback ไปห้องของสัญญา active
  // (ให้ตรงกับหน้า "ข้อมูลห้อง" — ไม่งั้นแจ้งซ่อมจะไปกอง "ไม่ระบุห้อง")
  let roomId: string | null = tenant.room_id;
  if (!roomId) {
    const { data: c } = await admin
      .from("contracts")
      .select("room_id")
      .eq("tenant_id", tenant.id)
      .eq("status", "active")
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    roomId = (c as { room_id?: string } | null)?.room_id ?? null;
  }

  // อัปโหลดรูป (ถ้ามี) — ตรวจชนิด/ขนาดฝั่ง server ไม่เชื่อ client
  let photo_url = "";
  const file = form.get("photo");
  if (file instanceof File && file.size > 0) {
    if (!OK_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "ไฟล์ต้องเป็นรูปภาพ" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "รูปใหญ่เกิน 8 MB" }, { status: 400 });
    }
    const ext = file.type.split("/")[1] || "jpg";
    const path = `${tenant.org_id}/${crypto.randomUUID()}.${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());
    const up = await admin.storage.from("maintenance").upload(path, buf, {
      contentType: file.type,
    });
    if (up.error) {
      return NextResponse.json({ error: "อัปโหลดรูปไม่สำเร็จ: " + up.error.message }, { status: 500 });
    }
    photo_url = admin.storage.from("maintenance").getPublicUrl(path).data.publicUrl;
  }

  const { error } = await admin.from("maintenance_requests").insert({
    org_id: tenant.org_id,
    room_id: roomId,
    tenant_id: tenant.id,
    title,
    description,
    photo_url,
    status: "open",
    source: "line",
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // แจ้งเตือนเจ้าของหอทาง LINE (best-effort — ไม่ให้ล้มถ้าส่งไม่ได้)
  try {
    const { data: org } = await admin
      .from("organizations")
      .select("owner_line_user_id")
      .eq("id", tenant.org_id)
      .maybeSingle();
    if (org?.owner_line_user_id) {
      await pushMessage(org.owner_line_user_id, [
        textMessage(`🔧 แจ้งซ่อมใหม่จากคุณ ${tenant.full_name}\n${title}${description ? "\n" + description : ""}`),
      ]);
    }
  } catch {
    /* ไม่เป็นไร */
  }

  return NextResponse.json({ ok: true });
}
