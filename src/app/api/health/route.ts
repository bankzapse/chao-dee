import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Health check สำหรับ uptime monitor — 200 = ปกติ, 503 = ต่อ DB ไม่ได้ */
export async function GET() {
  const started = Date.now();
  let db = false;
  try {
    const admin = createAdminClient();
    // query เบา ๆ เช็คว่าต่อ DB ได้ (head+count ไม่ดึงข้อมูล)
    const { error } = await admin.from("platform_settings").select("id", { count: "exact", head: true }).limit(1);
    db = !error;
  } catch {
    db = false;
  }
  const body = { status: db ? "ok" : "degraded", db, ms: Date.now() - started };
  return NextResponse.json(body, { status: db ? 200 : 503 });
}
