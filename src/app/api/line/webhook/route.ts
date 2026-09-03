import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  verifyLineSignature,
  replyMessage,
  pushMessage,
  textMessage,
  imageMessage,
  buttonsMessage,
  getLineContent,
  isLineConfigured,
  lineToken,
} from "@/lib/line";
import { formatBaht, formatDate, formatPeriod } from "@/lib/format";
import { toLocalThai } from "@/lib/phone";
import { isMaintenanceDetail } from "@/lib/line-commands";
import { isSlipReadable, readSlip } from "@/lib/slip";
import { buildInvoiceMessage } from "@/lib/invoice-message";

export const runtime = "nodejs";

type LineEvent = {
  type: string;
  replyToken?: string;
  source?: { userId?: string };
  message?: { type: string; text?: string; id?: string };
  postback?: { data?: string };
};

const HELP =
  "พิมพ์คำสั่งเพื่อใช้งาน:\n• “บิล” — ดูยอดค้างชำระ\n• “แจ้งซ่อม …” — แจ้งงานซ่อม\n• “พัสดุ” — เช็คพัสดุค้างรับ\n• “ห้อง” — ข้อมูลห้องพัก\n• “ชำระเงิน” — วิธีชำระเงิน\n• “ติดต่อ” — ติดต่อผู้ดูแล";

const LINE_API = "https://api.line.me/v2/bot";

/** ผูก rich menu ของเจ้าของหอให้ userId (แทนเมนู default ของผู้เช่า) — best-effort */
async function linkOwnerRichMenu(userId: string) {
  try {
    if (!isLineConfigured()) return;
    const token = lineToken();
    const listRes = await fetch(`${LINE_API}/richmenu/list`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!listRes.ok) return;
    const { richmenus } = (await listRes.json()) as { richmenus: { richMenuId: string; name: string }[] };
    const owner = (richmenus ?? []).find((r) => r.name === "Chao-Dee Owner");
    if (!owner) return; // ยังไม่ได้สร้างเมนูเจ้าของ (รัน setup-richmenu ก่อน)
    await fetch(`${LINE_API}/user/${userId}/richmenu/${owner.richMenuId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    /* best-effort — ไม่ให้ล้มการเชื่อมบัญชีถ้าผูกเมนูไม่ได้ */
  }
}

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

/** ผู้เช่าส่งรูปสลิปเข้ามาใน LINE OA → เก็บไฟล์ + แจ้งเจ้าของหอ */
async function handleSlipImage(
  supabase: ReturnType<typeof createAdminClient>,
  replyToken: string,
  lineUserId: string,
  messageId: string
) {
  // ต้องเป็นผู้เช่าที่ผูกบัญชีแล้วเท่านั้น
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, full_name, org_id")
    .eq("line_user_id", lineUserId)
    .maybeSingle();
  if (!tenant) {
    await replyMessage(replyToken, [
      textMessage(
        "กรุณาผูกบัญชีก่อนส่งสลิปครับ\nพิมพ์เบอร์โทรที่ลงทะเบียนไว้ (เช่น 0812345678) หรือรหัสเชื่อมบัญชีจากผู้ดูแล"
      ),
    ]);
    return;
  }

  // ห้องจากสัญญา active + บิลค้างที่เก่าที่สุดของผู้เช่า
  const { data: contract } = await supabase
    .from("contracts")
    .select("rooms(room_number)")
    .eq("tenant_id", tenant.id)
    .eq("status", "active")
    .maybeSingle();
  const room =
    (contract?.rooms as unknown as { room_number?: string } | null)?.room_number ?? "-";
  const { data: openInv } = await supabase
    .from("invoices")
    .select("id, total_amount, paid_amount")
    .eq("tenant_id", tenant.id)
    .in("status", ["unpaid", "partial"])
    .order("period", { ascending: true })
    .limit(1)
    .maybeSingle();
  const outstanding = openInv ? Number(openInv.total_amount) - Number(openInv.paid_amount) : 0;

  // ตอบผู้เช่าว่าได้รับแล้ว
  await replyMessage(replyToken, [
    textMessage(
      "ได้รับสลิปของคุณแล้ว ✅\nผู้ดูแลจะตรวจสอบและอัปเดตยอดชำระให้เร็วที่สุดครับ 🙏"
    ),
  ]);

  // ดาวน์โหลดรูป (ใช้ทั้งเก็บไฟล์ + ตรวจสลิป)
  const content = await getLineContent(messageId).catch(() => null);
  let slipLink = "";
  if (content) {
    try {
      const ext = content.contentType.includes("png") ? "png" : "jpg";
      const path = `line/${tenant.org_id}/${tenant.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("slips")
        .upload(path, content.buffer, { contentType: content.contentType, upsert: false });
      if (!upErr) {
        const { data: signed } = await supabase.storage
          .from("slips")
          .createSignedUrl(path, 60 * 60 * 24 * 30); // 30 วัน
        slipLink = signed?.signedUrl ?? "";
      }
    } catch {
      // เงียบไว้ — ยังแจ้งเจ้าของด้วยข้อความได้แม้เก็บไฟล์ไม่สำเร็จ
    }
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("owner_line_user_id")
    .eq("id", tenant.org_id)
    .maybeSingle();
  const owner = org?.owner_line_user_id;
  if (!owner) return;

  // Semi-auto: ถ้าตั้งค่าตรวจสลิป + มีบิลค้าง → ตรวจยอด แล้วแจ้งเจ้าของพร้อมปุ่มยืนยัน
  if (isSlipReadable() && content && openInv) {
    const slip = await readSlip(new Uint8Array(content.buffer).buffer as ArrayBuffer, content.contentType);
    if (slip.ok && slip.amount != null) {
      const match = slip.amount >= outstanding - 0.01;
      const aiNote = slip.method === "ai" ? "\n🔎 อ่านยอดด้วย AI — โปรดดูรูปสลิปก่อนยืนยัน" : "";
      const data = `action=confirm-pay&inv=${openInv.id}&ref=${encodeURIComponent(slip.transRef ?? "")}&amt=${slip.amount}`;
      await pushMessage(owner, [
        buttonsMessage(
          `สลิปห้อง ${room}`,
          `💸 สลิปโอน ห้อง ${room} · ${tenant.full_name}\nยอดโอน ${formatBaht(slip.amount)} · ค้าง ${formatBaht(outstanding)}\n${match ? "✅ ยอดตรง" : "⚠️ ยอดไม่ตรง — ตรวจก่อนยืนยัน"}${aiNote}`,
          [{ type: "postback", label: "✅ ยืนยันชำระ + ส่งใบเสร็จ", data, displayText: "ยืนยันชำระ" }]
        ),
      ]);
      if (slipLink) await pushMessage(owner, [imageMessage(slipLink)]);
      return;
    }
  }

  // ไม่ได้ตั้งค่าตรวจสลิป / ตรวจไม่สำเร็จ → แจ้งแบบข้อความให้เจ้าของบันทึกเอง (manual)
  await pushMessage(owner, [
    textMessage(
      `💸 ผู้เช่าส่งสลิปการโอนเข้ามา\nห้อง ${room} · ${tenant.full_name}${
        slipLink ? `\n\nดูสลิป: ${slipLink}` : ""
      }\n\nตรวจสอบและบันทึกการชำระในแอป Chao-Dee`
    ),
  ]);
  if (slipLink) await pushMessage(owner, [imageMessage(slipLink)]);
}

/** เจ้าของกดปุ่ม "ยืนยันชำระ" จากการแจ้งสลิป → mark ชำระ + ส่งใบเสร็จให้ผู้เช่า */
async function handlePostback(
  supabase: ReturnType<typeof createAdminClient>,
  replyToken: string,
  userId: string,
  data: string
) {
  const params = new URLSearchParams(data);
  if (params.get("action") !== "confirm-pay") return;
  const invoiceId = params.get("inv") ?? "";
  const transRef = params.get("ref") ?? "";
  const amt = Number(params.get("amt") ?? 0);
  if (!invoiceId) return;

  const { data: inv } = await supabase
    .from("invoices")
    .select("id, org_id, total_amount, paid_amount, status")
    .eq("id", invoiceId)
    .maybeSingle();
  if (!inv) {
    await replyMessage(replyToken, [textMessage("ไม่พบบิลนี้แล้ว")]);
    return;
  }
  // เฉพาะเจ้าของ org ของบิลนี้เท่านั้นที่ยืนยันได้
  const { data: org } = await supabase
    .from("organizations")
    .select("owner_line_user_id")
    .eq("id", inv.org_id)
    .maybeSingle();
  if (!org || org.owner_line_user_id !== userId) {
    await replyMessage(replyToken, [textMessage("เฉพาะเจ้าของหอเท่านั้นที่ยืนยันการชำระได้")]);
    return;
  }
  if (inv.status === "paid" || Number(inv.total_amount) - Number(inv.paid_amount) <= 0) {
    await replyMessage(replyToken, [textMessage("บิลนี้ชำระครบแล้ว ✅")]);
    return;
  }

  // กันใช้สลิปซ้ำ (unique org_id+trans_ref)
  if (transRef) {
    const { error: dupErr } = await supabase
      .from("slip_txns")
      .insert({ org_id: inv.org_id, invoice_id: invoiceId, trans_ref: transRef, amount: amt });
    if (dupErr && dupErr.code === "23505") {
      await replyMessage(replyToken, [textMessage("สลิปนี้ถูกใช้ยืนยันไปแล้ว ⚠️")]);
      return;
    }
  }

  // บันทึกชำระเต็มยอด + ปิดบิล
  const outstanding = Number(inv.total_amount) - Number(inv.paid_amount);
  const today = new Date().toISOString().slice(0, 10);
  await supabase.from("payments").insert({ invoice_id: invoiceId, amount: outstanding, method: "transfer", paid_at: today });
  await supabase.from("invoices").update({ paid_amount: Number(inv.total_amount), status: "paid" }).eq("id", invoiceId);

  // ส่งใบเสร็จให้ผู้เช่า
  const built = await buildInvoiceMessage(supabase, invoiceId);
  if (built?.lineUserId) await pushMessage(built.lineUserId, [textMessage(built.text)]);

  await replyMessage(replyToken, [
    textMessage(`บันทึกชำระ ${formatBaht(outstanding)} + ส่งใบเสร็จให้ผู้เช่าแล้ว ✅`),
  ]);
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
          "ยินดีต้อนรับสู่ Chao-Dee 🏠\nกรุณาพิมพ์ “เบอร์โทรของคุณ” (เช่น 0812345678) หรือ “รหัสเชื่อมบัญชี” ที่ได้รับจากผู้ดูแล เพื่อผูกบัญชี"
        ),
      ]);
      continue;
    }

    // ผู้เช่าส่งรูป (สลิปการโอน) → เก็บไว้ + ตรวจสลิป + แจ้งเจ้าของหอ
    if (event.type === "message" && event.message?.type === "image" && userId) {
      await handleSlipImage(supabase, replyToken, userId, event.message.id ?? "");
      continue;
    }

    // เจ้าของกดปุ่มยืนยันชำระ (จากการแจ้งสลิป)
    if (event.type === "postback" && userId) {
      await handlePostback(supabase, replyToken, userId, event.postback?.data ?? "");
      continue;
    }

    if (event.type !== "message" || event.message?.type !== "text" || !userId) continue;
    const text = (event.message.text ?? "").trim();

    // 1) เป็นผู้เช่าที่ผูกแล้วไหม
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id, full_name, org_id, line_state")
      .eq("line_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1) // กัน crash ถ้ามีผู้เช่า >1 คนผูก LINE เดียวกัน
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
      // กัน LINE เดียวผูกหลายผู้เช่า — เคลียร์ออกจากคนอื่น
      await supabase
        .from("tenants")
        .update({ line_user_id: "", line_link_code: "" })
        .eq("line_user_id", userId)
        .neq("id", matchTenant.id);
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
      // สลับให้เจ้าของเห็น rich menu ของเจ้าของ (แทนเมนูผู้เช่า)
      await linkOwnerRichMenu(userId);
      await replyMessage(replyToken, [
        textMessage(
          `เชื่อมบัญชีเจ้าของหอสำเร็จ ✅\n${matchOrg.name}\n\nเมนูด้านล่างเปลี่ยนเป็นเมนูเจ้าของแล้ว · คุณจะได้รับแจ้งเตือนทันทีเมื่อผู้เช่าแจ้งซ่อม`
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
        // กัน LINE เดียวผูกหลายผู้เช่า — เคลียร์ออกจากคนอื่น
        await supabase
          .from("tenants")
          .update({ line_user_id: "", line_link_code: "" })
          .eq("line_user_id", userId)
          .neq("id", byPhone[0].id);
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
      textMessage(`🔧 ${orgName}\nงานแจ้งซ่อมที่รอดำเนินการ: ${count ?? 0} รายการ\n\nดูรายละเอียดในแอป Chao-Dee`),
    ]);
    return;
  }
  if (t.includes("ค้าง") || t.includes("ชำระ")) {
    const { data: invs } = await supabase
      .from("invoices")
      .select("total_amount, paid_amount")
      .eq("org_id", orgId)
      .neq("status", "void");
    const rows = invs ?? [];
    const outstanding = rows.reduce((s, i) => s + (Number(i.total_amount) - Number(i.paid_amount)), 0);
    const n = rows.filter((i) => Number(i.total_amount) - Number(i.paid_amount) > 0).length;
    await replyMessage(replyToken, [
      textMessage(`💰 ${orgName}\nค้างชำระรวม: ${formatBaht(outstanding)}\nจำนวนบิลค้าง: ${n} ใบ\n\nดูรายละเอียด/ทวงถามได้ในแอป Chao-Dee`),
    ]);
    return;
  }
  if (t.includes("สรุป") || t.includes("ภาพรวม")) {
    const [{ data: contracts }, { data: invs }] = await Promise.all([
      supabase.from("contracts").select("rent_amount").eq("org_id", orgId).eq("status", "active"),
      supabase.from("invoices").select("total_amount, paid_amount").eq("org_id", orgId).neq("status", "void"),
    ]);
    const occupied = (contracts ?? []).length;
    const income = (contracts ?? []).reduce((s, c) => s + Number(c.rent_amount), 0);
    const outstanding = (invs ?? []).reduce((s, i) => s + (Number(i.total_amount) - Number(i.paid_amount)), 0);
    await replyMessage(replyToken, [
      textMessage(`📊 สรุป ${orgName}\nห้องมีผู้เช่า: ${occupied} ห้อง\nรายได้ค่าเช่า/เดือน: ${formatBaht(income)}\nค้างชำระสะสม: ${formatBaht(outstanding)}\n\nดูละเอียดในแอป Chao-Dee`),
    ]);
    return;
  }
  await replyMessage(replyToken, [
    textMessage(
      `สวัสดีเจ้าของหอ ${orgName} 👋\nพิมพ์คำสั่ง:\n• “แจ้งซ่อม” — งานซ่อมที่รอดำเนินการ\n• “ค้างชำระ” — ยอด/จำนวนบิลค้าง\n• “สรุป” — ภาพรวมหอ\nหรือจัดการทั้งหมดในแอป Chao-Dee`
    ),
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
  // หาห้อง: ใช้ห้องที่ผูกกับผู้เช่าโดยตรงก่อน (tenants.room_id) แล้วค่อย fallback สัญญา active
  const { data: tenant } = await supabase
    .from("tenants")
    .select("room_id, rooms(room_number)")
    .eq("id", tenantId)
    .maybeSingle();
  let roomId: string | null = (tenant?.room_id as string | null) ?? null;
  let roomNo = (tenant?.rooms as unknown as { room_number?: string } | null)?.room_number ?? "";
  if (!roomId) {
    const { data: contract } = await supabase
      .from("contracts")
      .select("room_id, rooms(room_number)")
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .maybeSingle();
    roomId = contract?.room_id ?? null;
    roomNo = (contract?.rooms as unknown as { room_number?: string } | null)?.room_number ?? "";
  }
  await supabase.from("maintenance_requests").insert({
    org_id: orgId,
    tenant_id: tenantId,
    room_id: roomId,
    title: detail.slice(0, 80),
    description: detail,
    source: "line",
    status: "open",
  });
  const room = roomNo || "-";
  await replyMessage(replyToken, [
    textMessage(
      `ขอบคุณที่แจ้งครับ 🙏\nเรารับเรื่อง “${detail}” และส่งให้ทีมงานดำเนินการแล้ว\nจะรีบดำเนินการให้เร็วที่สุดครับ 🛠️`
    ),
  ]);
  await notifyOwner(
    supabase,
    orgId,
    `🔧 แจ้งซ่อมใหม่\nห้อง ${room} · ${fullName}\n“${detail}”\nดูรายละเอียดในแอป Chao-Dee`
  );
}

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

  // กำลังรอรายละเอียดแจ้งซ่อม → ข้อความนี้คือรายละเอียด (เว้นแต่เป็นคำสั่งเมนูล้วนๆ)
  if (pendingState === "maintenance") {
    await supabase.from("tenants").update({ line_state: "" }).eq("id", tenantId);
    if (isMaintenanceDetail(text)) {
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
    const lines = parcels.map((p) => `• ${p.carrier || "พัสดุ"} (รับเข้า ${formatDate(p.received_at)})`);
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
      return `• ห้อง ${room} รอบ ${formatPeriod(i.period)}\n   ค้าง ${formatBaht(out)} (ครบกำหนด ${formatDate(i.due_date)})`;
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
        }\n💰 ค่าเช่า ${formatBaht(contract.rent_amount)}/เดือน\n📅 เริ่มสัญญา ${formatDate(contract.start_date)}`
      ),
    ]);
    return;
  }

  await replyMessage(replyToken, [textMessage(`คุณ ${fullName}\n\n${HELP}`)]);
}
