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

// ───────── เอกสารสัญญา (สัญญาเช่า/อื่นๆ) ─────────

export type ContractDocView = {
  id: string;
  doc_type: string;
  note: string;
  url: string;
  created_at: string;
};

/** ดึงเอกสารของสัญญา พร้อม signed URL */
export async function listContractDocuments(contractId: string): Promise<ContractDocView[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contract_documents")
    .select("id, doc_type, note, file_path, created_at")
    .eq("contract_id", contractId)
    .order("created_at", { ascending: false });

  const out: ContractDocView[] = [];
  for (const d of data ?? []) {
    const { data: signed } = await supabase.storage.from("documents").createSignedUrl(d.file_path, 60 * 60);
    out.push({ id: d.id, doc_type: d.doc_type, note: d.note, url: signed?.signedUrl ?? "", created_at: d.created_at });
  }
  return out;
}

/** บันทึกเอกสารสัญญาที่อัปโหลดแล้ว */
export async function addContractDocument(
  contractId: string,
  doc_type: string,
  file_path: string,
  note: string
): Promise<{ ok?: boolean; error?: string }> {
  if (!file_path) return { error: "ไม่พบไฟล์ที่อัปโหลด" };
  const supabase = await createClient();
  const org_id = await getOrgId();
  const { error } = await supabase
    .from("contract_documents")
    .insert({ org_id, contract_id: contractId, doc_type, file_path, note: note.trim() });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function deleteContractDocument(id: string): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase.from("contract_documents").select("file_path").eq("id", id).single();
  await supabase.from("contract_documents").delete().eq("id", id);
  if (data?.file_path) await supabase.storage.from("documents").remove([data.file_path]);
}
