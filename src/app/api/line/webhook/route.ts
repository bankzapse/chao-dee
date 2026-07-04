import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  verifyLineSignature,
  replyMessage,
  pushMessage,
  textMessage,
  isLineConfigured,
} from "@/lib/line";
import { formatBaht, formatPeriod } from "@/lib/format";
import { toLocalThai } from "@/lib/phone";

export const runtime = "nodejs";

type LineEvent = {
  type: string;
  replyToken?: string;
  source?: { userId?: string };
  message?: { type: string; text?: string };
};

const HELP =
  "พิมพ์คำสั่งเพื่อใช้งาน:\n• “บิล” — ดูยอดค้างชำระ\n• “แจ้งซ่อม …” — แจ้งงานซ่อม\n• “พัสดุ” — เช็คพัสดุค้างรับ\n• “ห้อง” — ข้อมูลห้องพัก\n• “ชำระเงิน” — วิธีชำระเงิน\n• “ติดต่อ” — ติดต่อผู้ดูแล";

/** ส่งแจ้งเตือนไปยัง LINE ของเจ้าของหอ (ถ้าผูกไว้) */
async function notifyOwner(
  supabase: ReturnType<typeof createAdminClient>,
  orgId: string,
  message: string
) {
  const { data: org } = await supabase
    .from("organizations")
    .select("owner_line_user_id")
    .eq("id", orgId)
    .maybeSingle();
  if (org?.owner_line_user_id) {
    await pushMessage(org.owner_line_user_id, [textMessage(message)]);
  }
}

export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("x-line-signature");

  if (!isLineConfigured()) {
    return NextResponse.json({ ok: false, reason: "not_configured" });
  }
  if (!verifyLineSignature(raw, signature)) {
    return new NextResponse("invalid signature", { status: 401 });
  }

  const body = JSON.parse(raw) as { events: LineEvent[] };
  const supabase = createAdminClient();

  for (const event of body.events ?? []) {
    const userId = event.source?.userId;
    const replyToken = event.replyToken;
    if (!replyToken) continue;

    if (event.type === "follow") {
      await replyMessage(replyToken, [
        textMessage(
          "ยินดีต้อนรับสู่ ChaoDee 🏠\nกรุณาพิมพ์ “เบอร์โทรของคุณ” (เช่น 0812345678) หรือ “รหัสเชื่อมบัญชี” ที่ได้รับจากผู้ดูแล เพื่อผูกบัญชี"
        ),
      ]);
      continue;
    }

    if (event.type !== "message" || event.message?.type !== "text" || !userId) continue;
    const text = (event.message.text ?? "").trim();

    // 1) เป็นผู้เช่าที่ผูกแล้วไหม
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id, full_name, org_id, line_state")
      .eq("line_user_id", userId)
      .maybeSingle();

    if (tenant) {
      await handleCommand(
        supabase,
        replyToken,
        tenant.id,
        tenant.org_id,
        tenant.full_name,
        tenant.line_state ?? "",
        text
      );
      continue;
    }

    // 2) เป็นเจ้าของหอที่ผูกแล้วไหม (เจ้าของก็ใช้คำสั่งภาพรวมได้)
    const { data: ownerOrg } = await supabase
      .from("organizations")
      .select("id, name")
      .eq("owner_line_user_id", userId)
      .maybeSingle();
    if (ownerOrg) {
      await handleOwner(supabase, replyToken, ownerOrg.id, ownerOrg.name, text);
      continue;
    }

    // 3) ยังไม่ผูก → ลองจับคู่รหัสเชื่อม (ผู้เช่า ก่อน แล้วเจ้าของ)
    const code = text.toUpperCase();
    const { data: matchTenant } = await supabase
      .from("tenants")
      .select("id, full_name")
      .eq("line_link_code", code)
      .neq("line_link_code", "")
      .maybeSingle();

    if (matchTenant) {
      await supabase
        .from("tenants")
        .update({ line_user_id: userId, line_link_code: "" })
        .eq("id", matchTenant.id);
      await replyMessage(replyToken, [
        textMessage(`เชื่อมบัญชีสำเร็จ ✅\nสวัสดีคุณ ${matchTenant.full_name}\n\n${HELP}`),
      ]);
      continue;
    }

    const { data: matchOrg } = await supabase
      .from("organizations")
      .select("id, name")
      .eq("line_link_code", code)
      .neq("line_link_code", "")
      .maybeSingle();

    if (matchOrg) {
      await supabase
        .from("organizations")
        .update({ owner_line_user_id: userId, line_link_code: "" })
        .eq("id", matchOrg.id);
      await replyMessage(replyToken, [
        textMessage(
          `เชื่อมบัญชีเจ้าของหอสำเร็จ ✅\n${matchOrg.name}\n\nคุณจะได้รับแจ้งเตือนทันทีเมื่อมีผู้เช่าแจ้งซ่อมผ่าน LINE`
        ),
      ]);
      continue;
    }

    // ลองจับคู่ด้วยเบอร์โทร (ผู้เช่าที่ลงทะเบียนไว้และยังไม่ได้ผูก LINE)
    const localPhone = toLocalThai(text);
    if (/^0\d{9}$/.test(localPhone)) {
      const { data: byPhone } = await supabase
        .from("tenants")
        .select("id, full_name")
        .eq("phone", localPhone)
        .eq("line_user_id", "");
      if (byPhone && byPhone.length === 1) {
        await supabase
          .from("tenants")
          .update({ line_user_id: userId, line_link_code: "" })
          .eq("id", byPhone[0].id);
        await replyMessage(replyToken, [
          textMessage(`เชื่อมบัญชีสำเร็จ ✅\nสวัสดีคุณ ${byPhone[0].full_name}\n\n${HELP}`),
        ]);
        continue;
      }
      if (byPhone && byPhone.length > 1) {
        await replyMessage(replyToken, [
          textMessage("เบอร์นี้มีหลายรายการในระบบ\nกรุณาใช้รหัสเชื่อมบัญชีที่ได้รับจากผู้ดูแลแทนครับ"),
        ]);
        continue;
      }
    }

    await replyMessage(replyToken, [
      textMessage(
        "ยังไม่พบข้อมูล\nกรุณาพิมพ์เบอร์โทรที่ลงทะเบียนไว้ (เช่น 0812345678) หรือรหัสเชื่อมบัญชีจากผู้ดูแล"
      ),
    ]);
  }

  return NextResponse.json({ ok: true });
}

/** คำสั่งสำหรับเจ้าของหอ (ดูภาพรวมผ่าน LINE) */
async function handleOwner(
  supabase: ReturnType<typeof createAdminClient>,
  replyToken: string,
  orgId: string,
  orgName: string,
  text: string
) {
  const t = text.toLowerCase();
  if (t.includes("แจ้งซ่อม") || t.includes("งานซ่อม") || t.includes("ซ่อม")) {
    const { count } = await supabase
      .from("maintenance_requests")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("status", "open");
    await replyMessage(replyToken, [
      textMessage(`🔧 ${orgName}\nงานแจ้งซ่อมที่รอดำเนินการ: ${count ?? 0} รายการ\n\nดูรายละเอียดในแอป ChaoDee`),
    ]);
    return;
  }
  await replyMessage(replyToken, [
    textMessage(`สวัสดีเจ้าของหอ ${orgName} 👋\nพิมพ์ “แจ้งซ่อม” เพื่อดูจำนวนงานที่รอดำเนินการ\nจัดการทั้งหมดได้ในแอป ChaoDee`),
  ]);
}

/** สร้างงานแจ้งซ่อม + ตอบขอบคุณ + แจ้งเตือนเจ้าของ */
async function createMaintenanceRequest(
  supabase: ReturnType<typeof createAdminClient>,
  replyToken: string,
  orgId: string,
  tenantId: string,
  fullName: string,
  detail: string
) {
  const { data: contract } = await supabase
    .from("contracts")
    .select("room_id, rooms(room_number)")
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .maybeSingle();
  await supabase.from("maintenance_requests").insert({
    org_id: orgId,
    tenant_id: tenantId,
    room_id: contract?.room_id ?? null,
    title: detail.slice(0, 80),
    description: detail,
    source: "line",
    status: "open",
  });
  const room = (contract?.rooms as unknown as { room_number?: string } | null)?.room_number ?? "-";
  await replyMessage(replyToken, [
    textMessage(
      `ขอบคุณที่แจ้งครับ 🙏\nเรารับเรื่อง “${detail}” และส่งให้ทีมงานดำเนินการแล้ว\nจะรีบดำเนินการให้เร็วที่สุดครับ 🛠️`
    ),
  ]);
  await notifyOwner(
    supabase,
    orgId,
    `🔧 แจ้งซ่อมใหม่\nห้อง ${room} · ${fullName}\n“${detail}”\nดูรายละเอียดในแอป ChaoDee`
  );
}

const MENU_CMD_RE =
  /^(บิล|ยอดค้าง|ค้างชำระ|พัสดุ|ห้อง|ข้อมูล|ชำระ|จ่ายเงิน|โอน|ติดต่อ|ผู้ดูแล|เจ้าของ|แจ้งซ่อม)/;

async function handleCommand(
  supabase: ReturnType<typeof createAdminClient>,
  replyToken: string,
  tenantId: string,
  orgId: string,
  fullName: string,
  pendingState: string,
  text: string
) {
  const t = text.toLowerCase();

  // กำลังรอรายละเอียดแจ้งซ่อม → ข้อความนี้คือรายละเอียด (เว้นแต่เป็นคำสั่งเมนู)
  if (pendingState === "maintenance") {
    await supabase.from("tenants").update({ line_state: "" }).eq("id", tenantId);
    if (!MENU_CMD_RE.test(text.trim())) {
      await createMaintenanceRequest(supabase, replyToken, orgId, tenantId, fullName, text.trim());
      return;
    }
    // เป็นคำสั่งเมนู → ล้าง state แล้วทำคำสั่งปกติต่อด้านล่าง
  }

  // แจ้งซ่อม
  if (text.startsWith("แจ้งซ่อม")) {
    const detail = text.replace(/^แจ้งซ่อม\s*/, "").trim();
    if (!detail) {
      // ยังไม่ระบุ → จำสถานะไว้ ให้พิมพ์รายละเอียดในข้อความถัดไปได้เลย
      await supabase.from("tenants").update({ line_state: "maintenance" }).eq("id", tenantId);
      await replyMessage(replyToken, [
        textMessage(
          "แจ้งซ่อมเรื่องอะไรครับ? พิมพ์รายละเอียดมาได้เลย เช่น\n• แอร์ไม่เย็น\n• ก๊อกน้ำห้องน้ำรั่ว"
        ),
      ]);
      return;
    }
    await createMaintenanceRequest(supabase, replyToken, orgId, tenantId, fullName, detail);
    return;
  }

  // พัสดุค้างรับ
  if (text.includes("พัสดุ")) {
    const { data: parcels } = await supabase
      .from("parcels")
      .select("carrier, received_at")
      .eq("tenant_id", tenantId)
      .eq("status", "pending")
      .order("received_at");
    if (!parcels || parcels.length === 0) {
      await replyMessage(replyToken, [textMessage(`คุณ ${fullName}\nไม่มีพัสดุค้างรับครับ`)]);
      return;
    }
    const lines = parcels.map((p) => `• ${p.carrier || "พัสดุ"} (รับเข้า ${p.received_at})`);
    await replyMessage(replyToken, [
      textMessage(`📦 พัสดุค้างรับ ${parcels.length} ชิ้น\n\n${lines.join("\n")}\n\nรับได้ที่สำนักงานหอพักครับ`),
    ]);
    return;
  }

  // ยอดค้าง / บิล
  if (t.includes("ยอดค้าง") || t.includes("ค้างชำระ") || t.includes("บิล")) {
    const { data: invoices } = await supabase
      .from("invoices")
      .select("period, total_amount, paid_amount, due_date, status, rooms(room_number)")
      .eq("tenant_id", tenantId)
      .in("status", ["unpaid", "partial"])
      .order("period", { ascending: false });

    if (!invoices || invoices.length === 0) {
      await replyMessage(replyToken, [textMessage(`คุณ ${fullName}\nไม่มียอดค้างชำระ 🎉`)]);
      return;
    }

    let total = 0;
    const lines = invoices.map((i) => {
      const out = Number(i.total_amount) - Number(i.paid_amount);
      total += out;
      const room = (i.rooms as unknown as { room_number: string } | null)?.room_number ?? "-";
      return `• ห้อง ${room} รอบ ${formatPeriod(i.period)}\n   ค้าง ${formatBaht(out)} (ครบกำหนด ${i.due_date})`;
    });

    await replyMessage(replyToken, [
      textMessage(
        `คุณ ${fullName}\nยอดค้างชำระทั้งหมด ${formatBaht(total)}\n\n${lines.join(
          "\n"
        )}\n\nชำระผ่าน PromptPay ตาม QR ในบิลได้เลยครับ`
      ),
    ]);
    return;
  }

  // วิธีชำระเงิน
  if (t.includes("ชำระ") || t.includes("จ่ายเงิน") || t.includes("โอน")) {
    await replyMessage(replyToken, [
      textMessage(
        "💳 วิธีชำระเงิน\n1) พิมพ์ “บิล” เพื่อดูยอดค้าง\n2) สแกน PromptPay QR ที่อยู่ในบิล\n3) โอนแล้วเก็บสลิปไว้เป็นหลักฐาน\n\nยอดจะอัปเดตหลังผู้ดูแลตรวจสอบครับ"
      ),
    ]);
    return;
  }

  // ติดต่อผู้ดูแล
  if (t.includes("ติดต่อ") || t.includes("ผู้ดูแล") || t.includes("เจ้าของ")) {
    const [{ data: org }, { data: owner }] = await Promise.all([
      supabase.from("organizations").select("name").eq("id", orgId).maybeSingle(),
      supabase
        .from("profiles")
        .select("phone")
        .eq("org_id", orgId)
        .eq("role", "owner")
        .maybeSingle(),
    ]);
    const phone = owner?.phone ? "0" + String(owner.phone).replace(/^66/, "") : "-";
    await replyMessage(replyToken, [
      textMessage(`☎️ ติดต่อผู้ดูแล\n${org?.name ?? "หอพัก"}\nโทร ${phone}\nหรือติดต่อที่สำนักงานหอพักครับ`),
    ]);
    return;
  }

  // ข้อมูลห้อง
  if (t.includes("ห้อง") || t.includes("ข้อมูล")) {
    const { data: contract } = await supabase
      .from("contracts")
      .select("rent_amount, start_date, rooms(room_number, buildings(name))")
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .maybeSingle();

    if (!contract) {
      await replyMessage(replyToken, [textMessage("ไม่พบสัญญาเช่าที่ใช้งานอยู่")]);
      return;
    }
    const room = contract.rooms as unknown as {
      room_number: string;
      buildings: { name: string } | null;
    } | null;
    await replyMessage(replyToken, [
      textMessage(
        `ข้อมูลห้องพักของคุณ ${fullName}\n🏢 ${room?.buildings?.name ?? "-"}\n🚪 ห้อง ${
          room?.room_number ?? "-"
        }\n💰 ค่าเช่า ${formatBaht(contract.rent_amount)}/เดือน\n📅 เริ่มสัญญา ${contract.start_date}`
      ),
    ]);
    return;
  }

  await replyMessage(replyToken, [textMessage(`คุณ ${fullName}\n\n${HELP}`)]);
}
