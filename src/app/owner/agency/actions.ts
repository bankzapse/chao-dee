"use server";

import { revalidatePath } from "next/cache";
import { requirePerm } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import { commissionOf, DEFAULT_COMMISSION_RATE, type DealStatus } from "@/lib/agency";
import type { FormState } from "@/components/action-form";

const PATH = "/owner/agency";

/** สร้างดีลนายหน้าจาก lead (ผู้สนใจเช่าที่เข้ามาทาง /rent) */
export async function createDealFromLead(leadId: string): Promise<void> {
  const { userId: adminId } = await requirePerm("agency");
  const admin = createAdminClient();

  const { data: lead } = await admin
    .from("listing_leads")
    .select("id, org_id, listing_id, name, phone")
    .eq("id", leadId)
    .maybeSingle();
  const l = lead as { id: string; org_id: string; listing_id: string; name: string; phone: string } | null;
  if (!l) return;

  // กันสร้างซ้ำจาก lead เดียวกัน
  const { data: exists } = await admin.from("agency_deals").select("id").eq("lead_id", l.id).maybeSingle();
  if (exists) return;

  await admin.from("agency_deals").insert({
    org_id: l.org_id,
    lead_id: l.id,
    listing_id: l.listing_id,
    lead_name: l.name ?? "",
    lead_phone: l.phone ?? "",
    status: "new",
    commission_rate: DEFAULT_COMMISSION_RATE,
    source: "rent_marketplace",
  });

  await logAudit({
    org_id: l.org_id,
    actor_id: adminId,
    action: "สร้างดีลนายหน้า",
    target: l.name ?? l.id,
    meta: { lead_id: l.id },
  });
  revalidatePath(PATH);
}

/** เลื่อนสถานะดีล (ติดต่อแล้ว / นัดดูห้อง) */
export async function setDealStatus(dealId: string, status: DealStatus): Promise<void> {
  const { userId: adminId } = await requirePerm("agency");
  if (!["contacted", "viewing"].includes(status)) return;
  const admin = createAdminClient();
  const { data: d } = await admin.from("agency_deals").select("org_id").eq("id", dealId).maybeSingle();
  await admin
    .from("agency_deals")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", dealId);
  await logAudit({
    org_id: (d as { org_id?: string } | null)?.org_id ?? null,
    actor_id: adminId,
    action: "อัปเดตสถานะดีลนายหน้า",
    target: status,
    meta: { deal_id: dealId },
  });
  revalidatePath(PATH);
}

/** ยืนยันว่าเซ็นสัญญาแล้ว → คำนวณค่านายหน้าจากค่าเช่า/เดือน */
export async function markDealSigned(
  dealId: string,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const { userId: adminId } = await requirePerm("agency");
  const rentRaw = Number(formData.get("rent_base") ?? 0);
  if (!Number.isFinite(rentRaw) || rentRaw <= 0) return { error: "กรุณาระบุค่าเช่า/เดือนให้ถูกต้อง" };

  const admin = createAdminClient();
  const { data: d } = await admin
    .from("agency_deals")
    .select("org_id, commission_rate")
    .eq("id", dealId)
    .maybeSingle();
  const deal = d as { org_id: string; commission_rate: number } | null;
  if (!deal) return { error: "ไม่พบดีลนี้" };

  const rate = Number(deal.commission_rate ?? DEFAULT_COMMISSION_RATE);
  const amount = commissionOf(rentRaw, rate);

  const { error } = await admin
    .from("agency_deals")
    .update({
      status: "signed",
      rent_base: rentRaw,
      commission_amount: amount,
      signed_at: new Date().toISOString(),
      note: String(formData.get("note") ?? "").trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", dealId);
  if (error) return { error: error.message };

  await logAudit({
    org_id: deal.org_id,
    actor_id: adminId,
    action: "ปิดดีลนายหน้า (เซ็นสัญญา)",
    meta: { deal_id: dealId, rent_base: rentRaw, commission: amount },
  });
  revalidatePath(PATH);
  return { ok: true };
}

/** ออกใบแจ้งหนี้ค่านายหน้า → เจ้าของหอเห็นและชำระได้ */
export async function issueCommissionInvoice(dealId: string): Promise<void> {
  const { userId: adminId } = await requirePerm("agency");
  const admin = createAdminClient();
  const { data: d } = await admin
    .from("agency_deals")
    .select("org_id, status, commission_amount")
    .eq("id", dealId)
    .maybeSingle();
  const deal = d as { org_id: string; status: string; commission_amount: number } | null;
  if (!deal || deal.status !== "signed" || Number(deal.commission_amount) <= 0) return;

  await admin
    .from("agency_deals")
    .update({ status: "invoiced", invoiced_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", dealId);
  await logAudit({
    org_id: deal.org_id,
    actor_id: adminId,
    action: "วางบิลค่านายหน้า",
    meta: { deal_id: dealId, amount: Number(deal.commission_amount) },
  });
  revalidatePath(PATH);
}

/** ยืนยันว่าได้รับเงินค่านายหน้าแล้ว */
export async function confirmCommissionPaid(dealId: string): Promise<void> {
  const { userId: adminId } = await requirePerm("agency");
  const admin = createAdminClient();
  const { data: d } = await admin
    .from("agency_deals")
    .select("org_id, status, commission_amount")
    .eq("id", dealId)
    .maybeSingle();
  const deal = d as { org_id: string; status: string; commission_amount: number } | null;
  if (!deal || deal.status !== "invoiced") return;

  await admin
    .from("agency_deals")
    .update({ status: "paid", paid_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", dealId);
  await logAudit({
    org_id: deal.org_id,
    actor_id: adminId,
    action: "ยืนยันรับค่านายหน้า",
    meta: { deal_id: dealId, amount: Number(deal.commission_amount) },
  });
  revalidatePath(PATH);
}

/** ยกเลิกดีล */
export async function cancelDeal(dealId: string): Promise<void> {
  const { userId: adminId } = await requirePerm("agency");
  const admin = createAdminClient();
  const { data: d } = await admin.from("agency_deals").select("org_id").eq("id", dealId).maybeSingle();
  await admin
    .from("agency_deals")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", dealId);
  await logAudit({
    org_id: (d as { org_id?: string } | null)?.org_id ?? null,
    actor_id: adminId,
    action: "ยกเลิกดีลนายหน้า",
    meta: { deal_id: dealId },
  });
  revalidatePath(PATH);
}
