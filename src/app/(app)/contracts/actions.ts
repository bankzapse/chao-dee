"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrgId } from "@/lib/auth";
import { money, intMin } from "@/lib/num";
import { commissionOf, DEFAULT_COMMISSION_RATE } from "@/lib/agency";
import type { FormState } from "@/components/action-form";
import { dbErrorMessage, NO_ROWS_MESSAGE } from "@/lib/db-error";

/**
 * ผูกสัญญาที่เพิ่งสร้างกับดีลนายหน้า → ปิดดีลเป็น "เซ็นสัญญาแล้ว" + คำนวณค่านายหน้า
 * best-effort: ถ้ายังไม่มีตาราง/ดีล หรือดีลปิดไปแล้ว จะข้ามเงียบ ๆ ไม่กระทบการสร้างสัญญา
 */
async function linkAgencyDeal(o: {
  leadId: string;
  orgId: string;
  roomId: string;
  tenantId: string;
  rent: number;
}) {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("agency_deals")
      .select("id, status, commission_rate, org_id")
      .eq("lead_id", o.leadId)
      .maybeSingle();
    const d = data as { id: string; status: string; commission_rate: number; org_id: string } | null;
    if (!d || d.org_id !== o.orgId) return;
    if (["signed", "invoiced", "paid", "cancelled"].includes(d.status)) return; // ปิดไปแล้ว ไม่ทับ
    const rate = Number(d.commission_rate ?? DEFAULT_COMMISSION_RATE);
    await admin
      .from("agency_deals")
      .update({
        status: "signed",
        room_id: o.roomId,
        tenant_id: o.tenantId,
        rent_base: o.rent,
        commission_amount: commissionOf(o.rent, rate),
        signed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", d.id);
  } catch {
    // เงียบไว้ — การสร้างสัญญาต้องไม่ล้มเพราะระบบนายหน้า
  }
}

/** true ถ้า error เกิดจากคอลัมน์ยังไม่มี (ยังไม่ได้รัน migration 0020) */
function isMissingColumn(msg?: string): boolean {
  return Boolean(msg && /schema cache|could not find the .* column/i.test(msg));
}
/** ตัดคอลัมน์ของ migration 0020 ออก (เผื่อ prod ยังไม่ได้รัน) */
function stripNewCols<T extends Record<string, unknown>>(row: T) {
  const rest = { ...row };
  delete rest.occupant_count;
  delete rest.late_fee;
  delete rest.late_fee_mode;
  delete rest.terms;
  return rest;
}

export async function createContract(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const room_id = String(formData.get("room_id") ?? "");
  const tenant_id = String(formData.get("tenant_id") ?? "");
  const start_date = String(formData.get("start_date") ?? "");
  const end_date = String(formData.get("end_date") ?? "").trim() || null;

  if (!room_id) return { error: "กรุณาเลือกห้อง" };
  if (!tenant_id) return { error: "กรุณาเลือกผู้เช่า" };
  if (!start_date) return { error: "กรุณาระบุวันเริ่มสัญญา" };
  if (end_date && end_date < start_date) return { error: "วันสิ้นสุดสัญญาต้องไม่ก่อนวันเริ่มสัญญา" };

  const supabase = await createClient();
  const org_id = await getOrgId();

  const lead_id = String(formData.get("lead_id") ?? "").trim() || null;
  const row = {
    org_id,
    room_id,
    tenant_id,
    start_date,
    end_date,
    ...(lead_id ? { lead_id } : {}),
    ...extraFields(formData),
    status: "active",
  };
  let { error } = await supabase.from("contracts").insert(row);
  if (isMissingColumn(error?.message)) {
    const { lead_id: _drop, ...noLead } = row as Record<string, unknown>;
    void _drop;
    ({ error } = await supabase.from("contracts").insert(stripNewCols(noLead)));
  }
  if (error) return { error: error.message };

  // ห้องที่มีสัญญา active → สถานะ "มีผู้เช่า"
  await supabase.from("rooms").update({ status: "occupied" }).eq("id", room_id);

  // ผูกดีลนายหน้า: ถ้าระบุว่ามาจาก Chao-Dee → ปิดดีล + คำนวณค่านายหน้าอัตโนมัติ
  if (lead_id) {
    await linkAgencyDeal({
      leadId: lead_id,
      orgId: org_id,
      roomId: room_id,
      tenantId: tenant_id,
      rent: Number(extraFields(formData).rent_amount) || 0,
    });
  }
  return { ok: true };
}

/** ฟิลด์ที่แก้ไขได้ทั้งตอนสร้างและแก้สัญญา (ค่าเช่า/ประกัน/ผู้พัก/ค่าปรับ/เงื่อนไข) */
function extraFields(formData: FormData) {
  const late_fee_mode = String(formData.get("late_fee_mode") ?? "once") === "per_day" ? "per_day" : "once";
  return {
    rent_amount: money(formData.get("rent_amount")),
    deposit_amount: money(formData.get("deposit_amount")),
    occupant_count: intMin(formData.get("occupant_count"), 1),
    late_fee: money(formData.get("late_fee")),
    late_fee_mode,
    terms: String(formData.get("terms") ?? "").trim(),
    note: String(formData.get("note") ?? "").trim(),
  };
}

/** แก้ไขสัญญา (ค่าเช่า/ประกัน/ผู้พัก/ค่าปรับ/เงื่อนไข/วันที่) — ไม่เปลี่ยนห้อง/ผู้เช่า */
export async function updateContract(
  id: string,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const start_date = String(formData.get("start_date") ?? "");
  const end_date = String(formData.get("end_date") ?? "").trim() || null;
  if (!start_date) return { error: "กรุณาระบุวันเริ่มสัญญา" };
  if (end_date && end_date < start_date) return { error: "วันสิ้นสุดสัญญาต้องไม่ก่อนวันเริ่มสัญญา" };

  const supabase = await createClient();
  const row = { start_date, end_date, ...extraFields(formData) };
  let { error } = await supabase.from("contracts").update(row).eq("id", id);
  if (isMissingColumn(error?.message)) {
    ({ error } = await supabase.from("contracts").update(stripNewCols(row)).eq("id", id));
  }
  if (error) return { error: error.message };
  return { ok: true };
}

/** สิ้นสุดสัญญา (ended) หรือยกเลิกก่อนกำหนด (terminated) + คืนห้องเป็นว่าง */
export async function closeContract(
  id: string,
  room_id: string,
  status: "ended" | "terminated"
): Promise<void> {
  const supabase = await createClient();
  await supabase.from("contracts").update({ status }).eq("id", id);
  await supabase.from("rooms").update({ status: "vacant" }).eq("id", room_id);
}

export async function deleteContract(id: string): Promise<FormState> {
  const supabase = await createClient();
  // .select() เพื่อรู้ว่าลบไปกี่แถว — RLS ไม่ได้ throw error แต่กรองแถวทิ้งเงียบๆ
  const { data, error } = await supabase.from("contracts").delete().eq("id", id).select("id");
  if (error) return { error: dbErrorMessage(error.message) };
  if (!data?.length) return { error: NO_ROWS_MESSAGE };
  return { ok: true };
}

// ───────── เอกสารสัญญา (เก็บใน storage โดยตรง — ไม่ต้องมีตาราง/migration) ─────────
// path: contracts/{contractId}/{docType}__{uuid}.{ext} — encode doc_type ไว้ในชื่อไฟล์

export type ContractDocView = {
  path: string; // ใช้เป็น id สำหรับลบ
  doc_type: string;
  url: string;
};

/** ดึงเอกสารของสัญญาจาก storage พร้อม signed URL */
export async function listContractDocuments(contractId: string): Promise<ContractDocView[]> {
  const supabase = await createClient();
  const dir = `contracts/${contractId}`;
  const { data: files } = await supabase.storage
    .from("documents")
    .list(dir, { limit: 100, sortBy: { column: "created_at", order: "desc" } });

  const out: ContractDocView[] = [];
  for (const f of files ?? []) {
    if (f.name.startsWith(".")) continue; // ข้าม placeholder
    const path = `${dir}/${f.name}`;
    const { data: signed } = await supabase.storage.from("documents").createSignedUrl(path, 60 * 60);
    out.push({ path, doc_type: f.name.split("__")[0] || "other", url: signed?.signedUrl ?? "" });
  }
  return out;
}

export async function deleteContractDocument(path: string): Promise<void> {
  const supabase = await createClient();
  await supabase.storage.from("documents").remove([path]);
}
