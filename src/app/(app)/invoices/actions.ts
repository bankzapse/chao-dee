"use server";

import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/auth";
import { pushMessage, textMessage, isLineConfigured } from "@/lib/line";
import { formatBaht, formatDate, formatPeriod } from "@/lib/format";
import type { FormState } from "@/components/action-form";
import type { PaymentMethod } from "@/lib/types";

/** true ถ้า error เกิดจากคอลัมน์ยังไม่มี (prod ยังไม่ได้รัน migration ใหม่) */
function isMissingColumn(msg?: string): boolean {
  return Boolean(msg && /schema cache|could not find the .* column/i.test(msg));
}
/** ตัดคอลัมน์ใหม่ออกจากแถวบิล (เผื่อ prod ยังไม่ได้รัน migration) */
function stripNewInvoiceCols<T extends Record<string, unknown>>(row: T) {
  const rest = { ...row };
  delete rest.parking_amount;
  delete rest.occupant_count;
  delete rest.late_fee;
  return rest;
}

/** ออกบิลอัตโนมัติสำหรับทุกห้องที่มีสัญญา active ในรอบเดือนที่เลือก (ข้ามห้องที่ออกบิลไปแล้ว) */
export async function generateInvoices(period: string): Promise<FormState> {
  const supabase = await createClient();
  const org_id = await getOrgId();

  const [{ data: contracts }, { data: readings }, { data: existing }, parking] =
    await Promise.all([
      supabase
        .from("contracts")
        .select(
          "id, room_id, tenant_id, rent_amount, occupant_count, late_fee, rooms(water_rate, water_mode, water_flat_per_person, electricity_rate)"
        )
        .eq("status", "active"),
      supabase
        .from("meter_readings")
        .select("room_id, period, water_value, electric_value")
        .lte("period", period),
      supabase.from("invoices").select("room_id").eq("period", period),
      // ค่าจอดรถต่อห้อง — query แยกเพื่อไม่พังทั้ง query ถ้า prod ยังไม่มีคอลัมน์ parking_fee
      supabase.from("rooms").select("id, parking_fee"),
    ]);

  const existingRooms = new Set((existing ?? []).map((e) => e.room_id));

  // แผนที่ ห้อง → ค่าจอดรถ/เดือน (ว่างถ้ายังไม่ได้รัน migration 0023)
  const parkingByRoom = new Map<string, number>();
  (parking.data ?? []).forEach((r: { id: string; parking_fee?: number }) =>
    parkingByRoom.set(r.id, Number(r.parking_fee ?? 0))
  );

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
        water_mode: "unit" | "flat_person";
        water_flat_per_person: number;
        electricity_rate: number;
      } | null;
      const m = meterMap.get(c.room_id);
      const occupants = Math.max(1, Number(c.occupant_count ?? 1));

      // ค่าน้ำ: เหมาจ่าย/คน หรือ ตามหน่วยมิเตอร์
      const flatPerson = room?.water_mode === "flat_person";
      const waterUnits = flatPerson
        ? 0
        : m?.cur && m?.prev
          ? Math.max(0, m.cur.w - m.prev.w)
          : 0;
      const waterAmount = flatPerson
        ? Number(room?.water_flat_per_person ?? 0) * occupants
        : waterUnits * Number(room?.water_rate ?? 0);

      const electricUnits =
        m?.cur && m?.prev ? Math.max(0, m.cur.e - m.prev.e) : 0;
      const electricAmount = electricUnits * Number(room?.electricity_rate ?? 0);
      const rent = Number(c.rent_amount);
      const parkingAmount = Number(parkingByRoom.get(c.room_id) ?? 0);
      const total = rent + waterAmount + electricAmount + parkingAmount;
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
        occupant_count: flatPerson ? occupants : 0,
        electric_units: electricUnits,
        electric_amount: electricAmount,
        rent_amount: rent,
        late_fee: Number(c.late_fee ?? 0), // ค่าปรับตามสัญญา (บันทึกไว้—ไม่รวมในยอดจนกว่าจะชำระล่าช้า)
        parking_amount: parkingAmount,
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

  let { error } = await supabase.from("invoices").insert(rows);
  if (isMissingColumn(error?.message)) {
    ({ error } = await supabase.from("invoices").insert(rows.map(stripNewInvoiceCols)));
  }
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
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.chao-dee.com").replace(/\/$/, "");
  const link = `${baseUrl}/bill/${invoiceId}`;

  const res = await pushMessage(tenant.line_user_id, [
    textMessage(
      `🧾 ใบแจ้งหนี้ ห้อง ${room}\nรอบ ${formatPeriod(inv.period)}\n\nยอดที่ต้องชำระ ${formatBaht(
        outstanding
      )}\nครบกำหนด ${formatDate(inv.due_date)}\n\n👉 กดดูรายละเอียด + สแกน QR ชำระเงิน:\n${link}\n\nโอนแล้วส่งสลิปกลับมาในแชทนี้ได้เลยครับ`
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
  // ลบรายการชำระที่ผูกกับบิลก่อน แล้วจึงลบบิล (กัน FK ค้าง)
  await supabase.from("payments").delete().eq("invoice_id", id);
  await supabase.from("invoices").delete().eq("id", id);
}
