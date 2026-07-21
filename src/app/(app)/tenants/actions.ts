"use server";

import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/auth";
import { checkLimit } from "@/lib/limits";
import { toLocalThai } from "@/lib/phone";
import type { FormState } from "@/components/action-form";
import { dbErrorMessage, NO_ROWS_MESSAGE } from "@/lib/db-error";

function isMissingColumn(msg?: string): boolean {
  return Boolean(msg && /schema cache|could not find the .* column/i.test(msg));
}
function stripRoom<T extends Record<string, unknown>>(row: T) {
  const rest = { ...row };
  delete rest.room_id;
  return rest;
}

function parse(formData: FormData) {
  const rawPhone = String(formData.get("phone") ?? "").trim();
  const room_id = String(formData.get("room_id") ?? "").trim();
  return {
    full_name: String(formData.get("full_name") ?? "").trim(),
    // เก็บเบอร์เป็นตัวเลขล้วน (0xxxxxxxxx) เพื่อให้ผูก LINE ด้วยเบอร์ได้แม่น
    phone: rawPhone ? toLocalThai(rawPhone) : "",
    email: String(formData.get("email") ?? "").trim(),
    id_card: String(formData.get("id_card") ?? "").trim(),
    room_id: room_id || null,
    note: String(formData.get("note") ?? "").trim(),
  };
}

export async function createTenant(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const data = parse(formData);
  if (!data.full_name) return { error: "กรุณาระบุชื่อผู้เช่า" };

  const limit = await checkLimit("tenants");
  if (limit) return limit;

  const supabase = await createClient();
  const org_id = await getOrgId();
  let { error } = await supabase.from("tenants").insert({ org_id, ...data });
  if (isMissingColumn(error?.message)) {
    ({ error } = await supabase.from("tenants").insert({ org_id, ...stripRoom(data) }));
  }
  if (error) return { error: error.message };
  return { ok: true };
}

export async function updateTenant(
  id: string,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const data = parse(formData);
  if (!data.full_name) return { error: "กรุณาระบุชื่อผู้เช่า" };

  const supabase = await createClient();
  let { error } = await supabase.from("tenants").update(data).eq("id", id);
  if (isMissingColumn(error?.message)) {
    ({ error } = await supabase.from("tenants").update(stripRoom(data)).eq("id", id));
  }
  if (error) return { error: error.message };
  return { ok: true };
}

export async function deleteTenant(id: string): Promise<FormState> {
  const supabase = await createClient();
  // .select() เพื่อรู้ว่าลบไปกี่แถว — RLS ไม่ได้ throw error แต่กรองแถวทิ้งเงียบๆ
  const { data, error } = await supabase.from("tenants").delete().eq("id", id).select("id");
  if (error) return { error: dbErrorMessage(error.message) };
  if (!data?.length) return { error: NO_ROWS_MESSAGE };
  return { ok: true };
}

/** สร้างรหัสเชื่อมบัญชี LINE 6 หลักให้ผู้เช่า แล้วคืนรหัสไปแสดง */
export async function generateLinkCode(id: string): Promise<{ code?: string; error?: string }> {
  const code = crypto.randomBytes(3).toString("hex").toUpperCase(); // 6 hex chars
  const supabase = await createClient();
  const { error } = await supabase
    .from("tenants")
    .update({ line_link_code: code, line_user_id: "" })
    .eq("id", id);
  if (error) return { error: error.message };
  return { code };
}

export async function unlinkLine(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("tenants").update({ line_user_id: "", line_link_code: "" }).eq("id", id);
}

// ───────── เอกสารผู้เช่า (รูปบัตร ปชช./ทะเบียนบ้าน ฯลฯ) ─────────

export type TenantDocView = {
  id: string;
  doc_type: string;
  note: string;
  url: string; // signed URL สำหรับแสดงรูป
  created_at: string;
};

/** ดึงรายการเอกสารของผู้เช่า พร้อม signed URL สำหรับแสดง */
export async function listTenantDocuments(tenantId: string): Promise<TenantDocView[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tenant_documents")
    .select("id, doc_type, note, file_path, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  const rows = data ?? [];
  const out: TenantDocView[] = [];
  for (const d of rows) {
    const { data: signed } = await supabase.storage
      .from("documents")
      .createSignedUrl(d.file_path, 60 * 60);
    out.push({
      id: d.id,
      doc_type: d.doc_type,
      note: d.note,
      url: signed?.signedUrl ?? "",
      created_at: d.created_at,
    });
  }
  return out;
}

/** บันทึกเอกสารที่อัปโหลดแล้ว (client อัปโหลดไฟล์เข้า bucket 'documents' ก่อน) */
export async function addTenantDocument(
  tenantId: string,
  doc_type: string,
  file_path: string,
  note: string
): Promise<{ ok?: boolean; error?: string }> {
  if (!file_path) return { error: "ไม่พบไฟล์ที่อัปโหลด" };
  const supabase = await createClient();
  const org_id = await getOrgId();
  const { error } = await supabase.from("tenant_documents").insert({
    org_id,
    tenant_id: tenantId,
    doc_type,
    file_path,
    note: note.trim(),
  });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function deleteTenantDocument(id: string): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tenant_documents")
    .select("file_path")
    .eq("id", id)
    .single();
  await supabase.from("tenant_documents").delete().eq("id", id);
  if (data?.file_path) {
    await supabase.storage.from("documents").remove([data.file_path]);
  }
}
