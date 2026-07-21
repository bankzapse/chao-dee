"use server";

import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/auth";
import { pushMessage, textMessage, isLineConfigured } from "@/lib/line";
import { formatBaht, formatDate, formatPeriod } from "@/lib/format";
import type { FormState } from "@/components/action-form";
import type { PaymentMethod } from "@/lib/types";

/** true ถ้า error เกิดจากคอลัมน์ยังไม่มี (prod ยังไม่ได้รัน migration ใหม่) */
function isMissingColumn(msg?: string): boolean {
  return Boolean(msg && /schema cache|could not find the .* column|does not exist/i.test(msg));
}
/** ตัดคอลัมน์ใหม่ออกจากแถวบิล (เผื่อ prod ยังไม่ได้รัน migration) */
function stripNewInvoiceCols<T extends Record<string, unknown>>(row: T) {
  const rest = { ...row };
  delete rest.parking_amount;
  delete rest.garbage_amount;
  delete rest.occupant_count;
  delete rest.late_fee;
  return rest;
}

type ContractLike = {
  id: string;
  room_id: string;
  tenant_id: string;
  rent_amount: number;
  occupant_count?: number;
  late_fee?: number;
  rooms?: unknown;
};

/** ดึงสัญญา active — resilient: ถ้า prod ยังไม่มีคอลัมน์ 0020 ให้ถอยไป select แบบเดิม */
async function loadActiveContracts(supabase: Awaited<ReturnType<typeof createClient>>) {
  let res = await supabase
    .from("contracts")
    .select(
      "id, room_id, tenant_id, rent_amount, occupant_count, late_fee, rooms(water_rate, water_mode, water_flat_per_person, electricity_rate)"
    )
    .eq("status", "active");
  if (isMissingColumn(res.error?.message)) {
    res = (await supabase
      .from("contracts")
      .select("id, room_id, tenant_id, rent_amount, rooms(water_rate, electricity_rate)")
      .eq("status", "active")) as typeof res;
  }
  return (res.data ?? []) as unknown as ContractLike[];
}

/** โหลดข้อมูลประกอบการคิดบิล (ใช้ร่วมกันทั้งออกบิลใหม่และคำนวณยอดใหม่) */
async function loadBillingCtx(
  supabase: Awaited<ReturnType<typeof createClient>>,
  period: string
) {
  const [{ data: readings }, { data: existing }, parking] = await Promise.all([
    supabase
      .from("meter_readings")
      .select("room_id, period, water_value, electric_value")
      .lte("period", period),
    // บิลที่ออกแล้วรอบนี้ — ไม่นับใบที่ยกเลิก (void) เพื่อให้ออกใบใหม่แทนได้
    supabase.from("invoices").select("room_id").eq("period", period).neq("status", "void"),
    // ค่าจอดรถต่อห้อง — query แยกเพื่อไม่พังทั้ง query ถ้า prod ยังไม่มีคอลัมน์ parking_fee
    supabase.from("rooms").select("id, parking_fee"),
  ]);

  const parkingByRoom = new Map<string, number>();
  (parking.data ?? []).forEach((r: { id: string; parking_fee?: number }) =>
    parkingByRoom.set(r.id, Number(r.parking_fee ?? 0))
  );

  // ค่าขยะ (0043) — query แยก + resilient เผื่อ prod ยังไม่ได้รัน migration
  const [garbageRooms, orgGarbage] = await Promise.all([
    supabase.from("rooms").select("id, garbage_fee"),
    supabase.from("organizations").select("garbage_mode, garbage_flat").maybeSingle(),
  ]);
  const garbageByRoom = new Map<string, number>();
  (garbageRooms.data ?? []).forEach((r: { id: string; garbage_fee?: number }) =>
    garbageByRoom.set(r.id, Number(r.garbage_fee ?? 0))
  );
  const og = orgGarbage.data as { garbage_mode?: string; garbage_flat?: number } | null;

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

  return {
    meterMap,
    parkingByRoom,
    garbageByRoom,
    garbageFlatMode: og?.garbage_mode === "flat",
    garbageFlat: Number(og?.garbage_flat ?? 0),
    existingRooms: new Set((existing ?? []).map((e) => e.room_id)),
  };
}

type BillingCtx = Awaited<ReturnType<typeof loadBillingCtx>>;

/** คิดค่าใช้จ่ายของห้องหนึ่งในรอบบิล (charges = ยอดก่อนบวก other/หัก discount) */
function computeCharges(c: ContractLike, ctx: BillingCtx) {
  const room = c.rooms as {
    water_rate: number;
    water_mode: "unit" | "flat_person";
    water_flat_per_person: number;
    electricity_rate: number;
  } | null;
  const m = ctx.meterMap.get(c.room_id);
  const occupants = Math.max(1, Number(c.occupant_count ?? 1));

  // ค่าน้ำ: เหมาจ่าย/คน หรือ ตามหน่วยมิเตอร์
  const flatPerson = room?.water_mode === "flat_person";
  const waterUnits = flatPerson ? 0 : m?.cur && m?.prev ? Math.max(0, m.cur.w - m.prev.w) : 0;
  const waterAmount = flatPerson
    ? Number(room?.water_flat_per_person ?? 0) * occupants
    : waterUnits * Number(room?.water_rate ?? 0);

  const electricUnits = m?.cur && m?.prev ? Math.max(0, m.cur.e - m.prev.e) : 0;
  const electricAmount = electricUnits * Number(room?.electricity_rate ?? 0);
  const rent = Number(c.rent_amount);
  const parkingAmount = Number(ctx.parkingByRoom.get(c.room_id) ?? 0);
  // ค่าขยะ: เหมาราคาเดียวทุกห้อง หรือ ระบุรายห้อง
  const garbageAmount = ctx.garbageFlatMode
    ? ctx.garbageFlat
    : Number(ctx.garbageByRoom.get(c.room_id) ?? 0);

  return {
    occupants,
    flatPerson,
    waterUnits,
    waterAmount,
    electricUnits,
    electricAmount,
    rent,
    parkingAmount,
    garbageAmount,
    charges: rent + waterAmount + electricAmount + parkingAmount + garbageAmount,
  };
}

/** ออกบิลอัตโนมัติสำหรับทุกห้องที่มีสัญญา active ในรอบเดือนที่เลือก (ข้ามห้องที่ออกบิลไปแล้ว) */
export async function generateInvoices(period: string): Promise<FormState> {
  if (!/^\d{4}-\d{2}$/.test(period)) return { error: "รอบบิลไม่ถูกต้อง (ต้องเป็น YYYY-MM)" };
  const supabase = await createClient();
  const org_id = await getOrgId();

  const contracts = await loadActiveContracts(supabase);
  const ctx = await loadBillingCtx(supabase, period);

  const today = new Date();
  const issue = today.toISOString().slice(0, 10);
  const due = new Date(today.getTime() + 7 * 86400000).toISOString().slice(0, 10);

  const rows = (contracts ?? [])
    .filter((c) => !ctx.existingRooms.has(c.room_id))
    .map((c) => {
      const ch = computeCharges(c as ContractLike, ctx);
      return {
        org_id,
        contract_id: c.id,
        room_id: c.room_id,
        tenant_id: c.tenant_id,
        period,
        issue_date: issue,
        due_date: due,
        water_units: ch.waterUnits,
        water_amount: ch.waterAmount,
        occupant_count: ch.flatPerson ? ch.occupants : 0,
        electric_units: ch.electricUnits,
        electric_amount: ch.electricAmount,
        rent_amount: ch.rent,
        late_fee: Number(c.late_fee ?? 0), // ค่าปรับตามสัญญา (บันทึกไว้—ไม่รวมในยอดจนกว่าจะชำระล่าช้า)
        parking_amount: ch.parkingAmount,
        garbage_amount: ch.garbageAmount,
        other_amount: 0,
        discount: 0,
        total_amount: ch.charges,
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

/**
 * คำนวณยอดบิลใหม่จากค่าปัจจุบันของห้อง (ค่าเช่า/น้ำ/ไฟ/จอดรถ/ขยะ)
 * ใช้เมื่อแก้ค่าขยะ/ค่าจอดรถ "หลัง" ออกบิลไปแล้ว — เดิมต้องลบบิลทิ้งแล้วออกใหม่
 * ทำเฉพาะบิลที่ยัง "ค้างชำระ" เท่านั้น (บิลที่จ่ายบางส่วน/จ่ายแล้ว ไม่แตะ เพื่อไม่ให้ยอดกับสถานะเพี้ยน)
 */
export async function recalcInvoices(period: string): Promise<FormState> {
  if (!/^\d{4}-\d{2}$/.test(period)) return { error: "รอบบิลไม่ถูกต้อง (ต้องเป็น YYYY-MM)" };
  const supabase = await createClient();

  const { data: invs } = await supabase
    .from("invoices")
    .select("id, room_id, other_amount, discount")
    .eq("period", period)
    .eq("status", "unpaid");
  if (!invs || invs.length === 0) {
    return { error: "ไม่มีบิลที่ยังค้างชำระในรอบนี้ให้คำนวณใหม่" };
  }

  const contracts = await loadActiveContracts(supabase);
  const byRoom = new Map((contracts ?? []).map((c) => [c.room_id, c]));
  const ctx = await loadBillingCtx(supabase, period);

  let updated = 0;
  for (const inv of invs as { id: string; room_id: string; other_amount: number; discount: number }[]) {
    const c = byRoom.get(inv.room_id);
    if (!c) continue;
    const ch = computeCharges(c as ContractLike, ctx);
    const extra = Number(inv.other_amount ?? 0) - Number(inv.discount ?? 0);

    const full = {
      water_units: ch.waterUnits,
      water_amount: ch.waterAmount,
      occupant_count: ch.flatPerson ? ch.occupants : 0,
      electric_units: ch.electricUnits,
      electric_amount: ch.electricAmount,
      rent_amount: ch.rent,
      parking_amount: ch.parkingAmount,
      garbage_amount: ch.garbageAmount,
      total_amount: Math.max(0, ch.charges + extra),
    };

    let { error } = await supabase.from("invoices").update(full).eq("id", inv.id);
    if (isMissingColumn(error?.message)) {
      // prod ยังไม่มีคอลัมน์ใหม่ → ตัดออก และคิดยอดโดยไม่รวมค่าที่เก็บไม่ได้ (กันยอดไม่ตรงรายการ)
      const lite = stripNewInvoiceCols(full);
      lite.total_amount = Math.max(0, ch.rent + ch.waterAmount + ch.electricAmount + extra);
      ({ error } = await supabase.from("invoices").update(lite).eq("id", inv.id));
    }
    if (!error) updated++;
  }

  if (updated === 0) {
    return { error: "คำนวณใหม่ไม่สำเร็จ — ไม่พบสัญญาที่ยังใช้งานอยู่ของห้องในบิลรอบนี้" };
  }
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
