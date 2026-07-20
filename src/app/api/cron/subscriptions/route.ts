import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSms, isSmsConfigured } from "@/lib/sms";
import { sendEmail, isEmailConfigured, emailShell } from "@/lib/email";

export const runtime = "nodejs";

/**
 * Cron รายวัน (ตั้งใน vercel.json):
 *  1) ตั้งสถานะ expired ให้แพ็คเกจที่เลยกำหนด
 *  2) ส่ง SMS แจ้งเตือนเจ้าของหอที่ใกล้หมดอายุ (2–3 วัน)
 * ป้องกันด้วย Authorization: Bearer ${CRON_SECRET}
 */
export async function GET(req: Request) {
  // fail-closed: ถ้าไม่ได้ตั้ง CRON_SECRET หรือ token ไม่ตรง → ปฏิเสธ (กัน endpoint หลุดเป็น public)
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
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

  // 1b) หมดอายุโปรโมทประกาศ (featured_until เลยวันนี้) — best-effort, ข้ามถ้ายังไม่มีตาราง
  try {
    await admin
      .from("property_listings")
      .update({ is_featured: false })
      .eq("is_featured", true)
      .lt("featured_until", now.toISOString().slice(0, 10));
  } catch {
    // ยังไม่ได้ migrate — ข้าม
  }

  // 2) reminders (ใกล้หมดใน 2–3 วัน) — ส่งได้ทั้ง SMS และอีเมล
  let reminded = 0;
  if (isSmsConfigured() || isEmailConfigured()) {
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
        .select("phone, email")
        .eq("org_id", s.org_id)
        .eq("role", "owner")
        .maybeSingle();
      const name = (s.organizations as { name?: string } | null)?.name ?? "หอพักของคุณ";
      let sent = false;
      if (owner?.phone && isSmsConfigured()) {
        const res = await sendSms(
          owner.phone,
          `แพ็คเกจ Chao-Dee ของ ${name} ใกล้หมดอายุ ต่ออายุได้ที่ https://chao-dee.com/renew เพื่อใช้งานต่อเนื่อง`
        );
        sent = sent || res.ok;
      }
      if (owner?.email && isEmailConfigured()) {
        const res = await sendEmail({
          to: owner.email,
          subject: `แพ็คเกจ Chao-Dee ของ ${name} ใกล้หมดอายุ`,
          html: emailShell(
            "แพ็คเกจใกล้หมดอายุ",
            `แพ็คเกจของ <b>${name}</b> จะหมดอายุเร็ว ๆ นี้ ต่ออายุเพื่อใช้งานต่อเนื่องได้เลย`,
            { label: "ต่ออายุแพ็คเกจ", url: "https://chao-dee.com/renew" }
          ),
        });
        sent = sent || res.ok;
      }
      if (sent) reminded++;
    }
  }

  // 3) เตือนค่านายหน้าค้างชำระเกินกำหนด (วางบิลเกิน 15 วันแล้วยังไม่ชำระ)
  let commissionReminded = 0;
  try {
    const dueBefore = new Date(now.getTime() - 15 * 86400000).toISOString();
    const { data: overdue } = await admin
      .from("agency_deals")
      .select("id, org_id, commission_amount, invoiced_at, organizations(name)")
      .eq("status", "invoiced")
      .lt("invoiced_at", dueBefore)
      .limit(200);

    for (const d of (overdue ?? []) as unknown as {
      org_id: string;
      commission_amount: number;
      organizations: { name?: string } | { name?: string }[] | null;
    }[]) {
      const o = Array.isArray(d.organizations) ? d.organizations[0] : d.organizations;
      const name = o?.name ?? "หอพักของคุณ";
      const amount = Number(d.commission_amount);
      if (isEmailConfigured()) {
        const { data: owner } = await admin
          .from("profiles")
          .select("email")
          .eq("org_id", d.org_id)
          .eq("role", "owner")
          .maybeSingle();
        const email = (owner as { email?: string } | null)?.email;
        if (email) {
          const res = await sendEmail({
            to: email,
            subject: `ค่านายหน้าค้างชำระ — ${name}`,
            html: emailShell(
              "ค่านายหน้าค้างชำระ",
              `ค่านายหน้าของ <b>${name}</b> ยอด <b>${amount.toLocaleString()} บาท</b> เกินกำหนดชำระแล้ว
               กรุณาชำระและแนบสลิปในระบบ`,
              { label: "ไปที่ดีลนายหน้า", url: "https://chao-dee.com/agency" }
            ),
          });
          if (res.ok) commissionReminded++;
        }
      }
    }
  } catch {
    // ยังไม่ได้ migrate 0044 หรือมีปัญหา — ข้าม
  }

  return NextResponse.json({
    ok: true,
    expired: expired?.length ?? 0,
    reminded,
    commissionReminded,
  });
}
