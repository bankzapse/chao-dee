"use server";

import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/auth";
import { pushMessage, textMessage, isLineConfigured } from "@/lib/line";
import { formatBaht, formatPeriod } from "@/lib/format";
import type { FormState } from "@/components/action-form";
import type { PaymentMethod } from "@/lib/types";

/** ออกบิลอัตโนมัติสำหรับทุกห้องที่มีสัญญา active ในรอบเดือนที่เลือก (ข้ามห้องที่ออกบิลไปแล้ว) */
export async function generateInvoices(period: string): Promise<FormState> {
  const supabase = await createClient();
  const org_id = await getOrgId();

  const [{ data: contracts }, { data: readings }, { data: existing }] =
    await Promise.all([
      supabase
        .from("contracts")
        .select(
          "id, room_id, tenant_id, rent_amount, rooms(water_rate, electricity_rate)"
        )
        .eq("status", "active"),
      supabase
        .from("meter_readings")
        .select("room_id, period, water_value, electric_value")
        .lte("period", period),
      supabase.from("invoices").select("room_id").eq("period", period),
    ]);

  const existingRooms = new Set((existing ?? []).map((e) => e.room_id));

  // map ค่ามิเตอร์: current (period ที่เลือก) + previous (ล่าสุดก่อนหน้า)
  const meterMap = new Map<
    string,
    { cur?: { w: number; e: number }; prev?: { p: string; w: number; e: number } }
  >();
  (readings ?? []).forEach((r) => {
    const entry = meterMap.get(r.room_id) ?? {};
    if (r.period === period) {
      entry.cur = { w: Number(r.water_value), e: Number(r.electric_value) };
    } else if (!entry.prev || r.period > entry.prev.p) {
      entry.prev = { p: r.period, w: Number(r.water_value), e: Number(r.electric_value) };
    }
    meterMap.set(r.room_id, entry);
  });

  const today = new Date();
  const issue = today.toISOString().slice(0, 10);
  const due = new Date(today.getTime() + 7 * 86400000).toISOString().slice(0, 10);

  const rows = (contracts ?? [])
    .filter((c) => !existingRooms.has(c.room_id))
    .map((c) => {
      const room = c.rooms as unknown as {
        water_rate: number;
        electricity_rate: number;
      } | null;
      const m = meterMap.get(c.room_id);
      const waterUnits =
        m?.cur && m?.prev ? Math.max(0, m.cur.w - m.prev.w) : 0;
      const electricUnits =
        m?.cur && m?.prev ? Math.max(0, m.cur.e - m.prev.e) : 0;
      const waterAmount = waterUnits * Number(room?.water_rate ?? 0);
      const electricAmount = electricUnits * Number(room?.electricity_rate ?? 0);
      const rent = Number(c.rent_amount);
      const total = rent + waterAmount + electricAmount;
      return {
        org_id,
        contract_id: c.id,
        room_id: c.room_id,
        tenant_id: c.tenant_id,
        period,
        issue_date: issue,
        due_date: due,
        water_units: waterUnits,
        water_amount: waterAmount,
        electric_units: electricUnits,
        electric_amount: electricAmount,
        rent_amount: rent,
        other_amount: 0,
        discount: 0,
        total_amount: total,
        paid_amount: 0,
        status: "unpaid" as const,
      };
    });

  if (rows.length === 0) {
    return { error: "ไม่มีบิลใหม่ให้ออก (ทุกห้องที่มีสัญญาออกบิลรอบนี้แล้ว หรือยังไม่มีสัญญา active)" };
  }

  const { error } = await supabase.from("invoices").insert(rows);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function recordPayment(
  invoiceId: string,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const amount = Number(formData.get("amount") ?? 0);
  const paid_at = String(formData.get("paid_at") ?? "");
  if (amount <= 0) return { error: "จำนวนเงินต้องมากกว่า 0" };
  if (!paid_at) return { error: "กรุณาระบุวันที่ชำระ" };

  const supabase = await createClient();
  const org_id = await getOrgId();
  const { error } = await supabase.from("payments").insert({
    org_id,
    invoice_id: invoiceId,
    amount,
    method: String(formData.get("method") ?? "transfer") as PaymentMethod,
    paid_at,
    note: String(formData.get("note") ?? "").trim(),
  });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function deletePayment(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("payments").delete().eq("id", id);
}

/** ส่งบิลไปยังผู้เช่าผ่าน LINE */
export async function sendInvoiceViaLine(
  invoiceId: string
): Promise<{ ok?: boolean; error?: string }> {
  if (!isLineConfigured()) {
    return { error: "ยังไม่ได้ตั้งค่า LINE (ตั้งค่า LINE_CHANNEL_ACCESS_TOKEN ใน .env.local)" };
  }
  const supabase = await createClient();
  const { data: inv } = await supabase
    .from("invoices")
    .select(
      "period, total_amount, paid_amount, due_date, tenants(full_name, line_user_id), rooms(room_number)"
    )
    .eq("id", invoiceId)
    .single();

  if (!inv) return { error: "ไม่พบบิล" };
  const tenant = inv.tenants as unknown as {
    full_name: string;
    line_user_id: string;
  } | null;
  if (!tenant?.line_user_id) {
    return { error: "ผู้เช่ายังไม่ได้เชื่อมบัญชี LINE" };
  }
  const room = (inv.rooms as unknown as { room_number: string } | null)?.room_number ?? "-";
  const outstanding = Number(inv.total_amount) - Number(inv.paid_amount);

  const res = await pushMessage(tenant.line_user_id, [
    textMessage(
      `🧾 ใบแจ้งหนี้ ห้อง ${room}\nรอบ ${formatPeriod(inv.period)}\n\nยอดชำระ ${formatBaht(
        inv.total_amount
      )}\nค้างชำระ ${formatBaht(outstanding)}\nครบกำหนด ${inv.due_date}\n\nชำระผ่าน PromptPay ได้ที่ QR ในระบบครับ`
    ),
  ]);
  if (!res.ok) return { error: "ส่งไม่สำเร็จ: " + (res.error ?? res.status) };
  return { ok: true };
}

export async function voidInvoice(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("invoices").update({ status: "void" }).eq("id", id);
}

export async function deleteInvoice(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("invoices").delete().eq("id", id);
}
