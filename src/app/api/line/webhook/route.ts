import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  verifyLineSignature,
  replyMessage,
  textMessage,
  isLineConfigured,
} from "@/lib/line";
import { formatBaht, formatPeriod } from "@/lib/format";

export const runtime = "nodejs";

type LineEvent = {
  type: string;
  replyToken?: string;
  source?: { userId?: string };
  message?: { type: string; text?: string };
};

const HELP =
  "พิมพ์คำสั่งเพื่อใช้งาน:\n• “ยอดค้าง” — ดูยอดค้างชำระ\n• “บิล” — ดูบิลล่าสุด\n• “ห้อง” — ดูข้อมูลห้องพัก\n• “แจ้งซ่อม …” — แจ้งงานซ่อม\n• “พัสดุ” — เช็คพัสดุค้างรับ";

export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("x-line-signature");

  if (!isLineConfigured()) {
    // ยังไม่ตั้งค่า LINE — ตอบ 200 เพื่อไม่ให้ LINE retry
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

    // ผู้ใช้เพิ่งเพิ่มเพื่อน
    if (event.type === "follow") {
      await replyMessage(replyToken, [
        textMessage(
          "ยินดีต้อนรับสู่ระบบหอพัก 🏠\nกรุณาพิมพ์ “รหัสเชื่อมบัญชี” ที่ได้รับจากผู้ดูแล เพื่อผูกบัญชีของคุณ"
        ),
      ]);
      continue;
    }

    if (event.type !== "message" || event.message?.type !== "text" || !userId) continue;
    const text = (event.message.text ?? "").trim();

    // หาผู้เช่าที่ผูกบัญชี LINE นี้แล้ว
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id, full_name, org_id")
      .eq("line_user_id", userId)
      .maybeSingle();

    // ยังไม่ผูก → ลองจับคู่รหัสเชื่อมบัญชี
    if (!tenant) {
      const code = text.toUpperCase();
      const { data: match } = await supabase
        .from("tenants")
        .select("id, full_name")
        .eq("line_link_code", code)
        .neq("line_link_code", "")
        .maybeSingle();

      if (match) {
        await supabase
          .from("tenants")
          .update({ line_user_id: userId, line_link_code: "" })
          .eq("id", match.id);
        await replyMessage(replyToken, [
          textMessage(`เชื่อมบัญชีสำเร็จ ✅\nสวัสดีคุณ ${match.full_name}\n\n${HELP}`),
        ]);
      } else {
        await replyMessage(replyToken, [
          textMessage(
            "ยังไม่พบการเชื่อมบัญชี\nกรุณาพิมพ์รหัสเชื่อมบัญชี (6 หลัก) ที่ได้รับจากผู้ดูแลหอพัก"
          ),
        ]);
      }
      continue;
    }

    // ผูกบัญชีแล้ว → ประมวลผลคำสั่ง
    await handleCommand(supabase, replyToken, tenant.id, tenant.org_id, tenant.full_name, text);
  }

  return NextResponse.json({ ok: true });
}

async function handleCommand(
  supabase: ReturnType<typeof createAdminClient>,
  replyToken: string,
  tenantId: string,
  orgId: string,
  fullName: string,
  text: string
) {
  const t = text.toLowerCase();

  // แจ้งซ่อม
  if (text.startsWith("แจ้งซ่อม")) {
    const detail = text.replace(/^แจ้งซ่อม\s*/, "").trim() || "แจ้งซ่อม (ไม่ระบุรายละเอียด)";
    const { data: contract } = await supabase
      .from("contracts")
      .select("room_id")
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
    await replyMessage(replyToken, [
      textMessage(`รับแจ้งซ่อมเรียบร้อย ✅\n“${detail}”\nเจ้าหน้าที่จะดำเนินการโดยเร็วครับ`),
    ]);
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
    const lines = parcels.map(
      (p) => `• ${p.carrier || "พัสดุ"} (รับเข้า ${p.received_at})`
    );
    await replyMessage(replyToken, [
      textMessage(`📦 พัสดุค้างรับ ${parcels.length} ชิ้น\n\n${lines.join("\n")}\n\nรับได้ที่สำนักงานหอพักครับ`),
    ]);
    return;
  }

  if (text.includes("ยอดค้าง") || text.includes("ค้างชำระ") || text.includes("บิล")) {
    const { data: invoices } = await supabase
      .from("invoices")
      .select("period, total_amount, paid_amount, due_date, status, rooms(room_number)")
      .eq("tenant_id", tenantId)
      .in("status", ["unpaid", "partial"])
      .order("period", { ascending: false });

    if (!invoices || invoices.length === 0) {
      await replyMessage(replyToken, [
        textMessage(`คุณ ${fullName}\nไม่มียอดค้างชำระ 🎉`),
      ]);
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
