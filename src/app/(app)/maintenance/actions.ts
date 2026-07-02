"use server";

import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/auth";
import { pushMessage, textMessage, isLineConfigured } from "@/lib/line";
import type { FormState } from "@/components/action-form";
import type { MaintenanceStatus } from "@/lib/types";
import { MAINTENANCE_STATUS_LABEL } from "@/lib/format";

export async function createMaintenance(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "กรุณาระบุหัวข้อ" };

  const supabase = await createClient();
  const org_id = await getOrgId();
  const room_id = String(formData.get("room_id") ?? "") || null;

  const { error } = await supabase.from("maintenance_requests").insert({
    org_id,
    room_id,
    tenant_id: String(formData.get("tenant_id") ?? "") || null,
    title,
    description: String(formData.get("description") ?? "").trim(),
    source: "staff",
  });
  if (error) return { error: error.message };
  return { ok: true };
}

/** เปลี่ยนสถานะงานซ่อม + แจ้งผู้เช่าทาง LINE (ถ้าผูกบัญชีไว้) */
export async function updateMaintenanceStatus(
  id: string,
  status: MaintenanceStatus
): Promise<void> {
  const supabase = await createClient();
  const { data: req } = await supabase
    .from("maintenance_requests")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("title, tenants(line_user_id)")
    .single();

  if (isLineConfigured() && req) {
    const tenant = req.tenants as unknown as { line_user_id: string } | null;
    if (tenant?.line_user_id) {
      await pushMessage(tenant.line_user_id, [
        textMessage(
          `🔧 อัปเดตงานแจ้งซ่อม: ${req.title}\nสถานะ: ${MAINTENANCE_STATUS_LABEL[status]}`
        ),
      ]);
    }
  }
}

export async function deleteMaintenance(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("maintenance_requests").delete().eq("id", id);
}
