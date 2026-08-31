import type { SupabaseClient } from "@supabase/supabase-js";
import { formatBaht, formatDate, formatPeriod, formatNumber } from "@/lib/format";

/**
 * สร้างข้อความบิล/ใบเสร็จสำหรับส่งผ่าน LINE (ใช้ร่วมกันทั้งปุ่มในเว็บ + webhook ยืนยันสลิป)
 * รวม breakdown ค่าเช่า/น้ำ/ไฟ (เลขมิเตอร์ก่อน/หลัง) + แยกใบแจ้งหนี้/ใบเสร็จตามสถานะ
 * คืน null ถ้าไม่พบบิล · lineUserId = null ถ้าผู้เช่ายังไม่ผูก LINE
 */
export async function buildInvoiceMessage(
  supabase: SupabaseClient,
  invoiceId: string
): Promise<{ text: string; lineUserId: string | null; paid: boolean } | null> {
  const { data: inv } = await supabase
    .from("invoices")
    .select(
      "period, status, room_id, occupant_count, rent_amount, water_units, water_amount, electric_units, electric_amount, parking_amount, garbage_amount, other_amount, total_amount, paid_amount, due_date, tenants(line_user_id), rooms(room_number)"
    )
    .eq("id", invoiceId)
    .single();
  if (!inv) return null;

  const lineUserId =
    (inv.tenants as unknown as { line_user_id?: string } | null)?.line_user_id || null;
  const room = (inv.rooms as unknown as { room_number?: string } | null)?.room_number ?? "-";
  const outstanding = Number(inv.total_amount) - Number(inv.paid_amount);
  const paid = inv.status === "paid" || outstanding <= 0;
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.chao-dee.com").replace(/\/$/, "");
  const link = `${baseUrl}/bill/${invoiceId}`;
  const n = (v: unknown) => Number(v ?? 0);

  // เลขมิเตอร์ก่อน/หลัง (น้ำ/ไฟ)
  const { data: readings } = await supabase
    .from("meter_readings")
    .select("period, water_value, electric_value")
    .eq("room_id", inv.room_id)
    .lte("period", inv.period)
    .order("period", { ascending: false })
    .limit(2);
  const curR = readings?.[0] as { water_value?: number; electric_value?: number } | undefined;
  const prevR = readings?.[1] as { water_value?: number; electric_value?: number } | undefined;
  const meter = (prev?: number, cur?: number, units?: number) =>
    prev != null && cur != null
      ? ` (เลขก่อน ${formatNumber(prev)} → เลขหลัง ${formatNumber(cur)} = ${formatNumber(units ?? 0)} หน่วย)`
      : units
        ? ` (${formatNumber(units)} หน่วย)`
        : "";

  const { data: itemRows } = await supabase
    .from("invoice_items")
    .select("description, amount")
    .eq("invoice_id", invoiceId)
    .order("created_at", { ascending: true });
  const items = (itemRows ?? []) as { description: string; amount: number }[];

  const lines: string[] = [];
  if (n(inv.rent_amount) > 0) lines.push(`• ค่าเช่าห้อง ${formatBaht(n(inv.rent_amount))}`);
  if (n(inv.water_amount) > 0 || n(inv.water_units) > 0) {
    const wd =
      n(inv.occupant_count) > 0
        ? ` (เหมาจ่าย ${formatNumber(n(inv.occupant_count))} คน)`
        : meter(prevR?.water_value, curR?.water_value, n(inv.water_units));
    lines.push(`• ค่าน้ำ${wd} ${formatBaht(n(inv.water_amount))}`);
  }
  if (n(inv.electric_amount) > 0 || n(inv.electric_units) > 0)
    lines.push(`• ค่าไฟฟ้า${meter(prevR?.electric_value, curR?.electric_value, n(inv.electric_units))} ${formatBaht(n(inv.electric_amount))}`);
  if (n(inv.parking_amount) > 0) lines.push(`• ค่าจอดรถ ${formatBaht(n(inv.parking_amount))}`);
  if (n(inv.garbage_amount) > 0) lines.push(`• ค่าขยะ ${formatBaht(n(inv.garbage_amount))}`);
  if (items.length > 0) {
    items.forEach((it) => {
      if (n(it.amount) !== 0) lines.push(`• ${it.description} ${formatBaht(n(it.amount))}`);
    });
  } else if (n(inv.other_amount) > 0) {
    lines.push(`• ค่าใช้จ่ายอื่นๆ ${formatBaht(n(inv.other_amount))}`);
  }
  const breakdown = lines.length ? `${lines.join("\n")}\n─────────\n` : "";

  const head = paid
    ? `✅ ใบเสร็จรับเงิน ห้อง ${room}\nรอบ ${formatPeriod(inv.period)}`
    : `🧾 ใบแจ้งหนี้ ห้อง ${room}\nรอบ ${formatPeriod(inv.period)}`;
  const foot = paid
    ? `รวมชำระแล้ว ${formatBaht(n(inv.total_amount))} ✅\n\nขอบคุณที่ชำระเงินครับ 🙏\n👉 ดูใบเสร็จ:\n${link}`
    : `ยอดที่ต้องชำระ ${formatBaht(outstanding)}\nครบกำหนด ${formatDate(inv.due_date)}\n\n👉 กดดูใบแจ้งหนี้ + สแกน QR ชำระเงิน:\n${link}\n\nโอนแล้วส่งสลิปกลับมาในแชทนี้ได้เลยครับ`;

  return { text: `${head}\n\n${breakdown}${foot}`, lineUserId, paid };
}
