import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSms, isSmsConfigured } from "@/lib/sms";

export const runtime = "nodejs";

/**
 * Cron รายวัน (ตั้งใน vercel.json):
 *  1) ตั้งสถานะ expired ให้แพ็คเกจที่เลยกำหนด
 *  2) ส่ง SMS แจ้งเตือนเจ้าของหอที่ใกล้หมดอายุ (2–3 วัน)
 * ป้องกันด้วย Authorization: Bearer ${CRON_SECRET}
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("unauthorized", { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();

  // 1) auto-expire
  const { data: expired } = await admin
    .from("subscriptions")
    .update({ status: "expired", updated_at: now.toISOString() })
    .in("status", ["active", "trialing"])
    .lt("expires_at", now.toISOString())
    .select("id");

  // 2) reminders (ใกล้หมดใน 2–3 วัน)
  let reminded = 0;
  if (isSmsConfigured()) {
    const from = new Date(now.getTime() + 2 * 86400000).toISOString();
    const to = new Date(now.getTime() + 3 * 86400000).toISOString();
    const { data: soon } = await admin
      .from("subscriptions")
      .select("org_id, expires_at, organizations(name)")
      .in("status", ["active", "trialing"])
      .gte("expires_at", from)
      .lte("expires_at", to);

    for (const s of soon ?? []) {
      const { data: owner } = await admin
        .from("profiles")
        .select("phone")
        .eq("org_id", s.org_id)
        .eq("role", "owner")
        .maybeSingle();
      if (!owner?.phone) continue;
      const name = (s.organizations as { name?: string } | null)?.name ?? "หอพักของคุณ";
      const res = await sendSms(
        owner.phone,
        `แพ็คเกจ ChaoDee ของ ${name} ใกล้หมดอายุ ต่ออายุได้ที่ https://chao-dee.com/renew เพื่อใช้งานต่อเนื่อง`
      );
      if (res.ok) reminded++;
    }
  }

  return NextResponse.json({
    ok: true,
    expired: expired?.length ?? 0,
    reminded,
  });
}
