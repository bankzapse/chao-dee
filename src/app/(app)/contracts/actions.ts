"use server";

import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/auth";
import type { FormState } from "@/components/action-form";

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

  const supabase = await createClient();
  const org_id = await getOrgId();

  const row = { org_id, room_id, tenant_id, start_date, end_date, ...extraFields(formData), status: "active" };
  let { error } = await supabase.from("contracts").insert(row);
  if (isMissingColumn(error?.message)) {
    ({ error } = await supabase.from("contracts").insert(stripNewCols(row)));
  }
  if (error) return { error: error.message };

  // ห้องที่มีสัญญา active → สถานะ "มีผู้เช่า"
  await supabase.from("rooms").update({ status: "occupied" }).eq("id", room_id);
  return { ok: true };
}

/** ฟิลด์ที่แก้ไขได้ทั้งตอนสร้างและแก้สัญญา (ค่าเช่า/ประกัน/ผู้พัก/ค่าปรับ/เงื่อนไข) */
function extraFields(formData: FormData) {
  const late_fee_mode = String(formData.get("late_fee_mode") ?? "once") === "per_day" ? "per_day" : "once";
  return {
    rent_amount: Number(formData.get("rent_amount") ?? 0),
    deposit_amount: Number(formData.get("deposit_amount") ?? 0),
    occupant_count: Math.max(1, Number(formData.get("occupant_count") ?? 1)),
    late_fee: Number(formData.get("late_fee") ?? 0),
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

export async function deleteContract(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("contracts").delete().eq("id", id);
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
