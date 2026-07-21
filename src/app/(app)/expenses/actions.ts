"use server";

import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/auth";
import { money } from "@/lib/num";
import type { FormState } from "@/components/action-form";
import { dbErrorMessage, NO_ROWS_MESSAGE } from "@/lib/db-error";

export async function createExpense(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const building_id = String(formData.get("building_id") ?? "");
  const expense_date = String(formData.get("expense_date") ?? "");
  const amount = money(formData.get("amount"));
  if (!building_id) return { error: "กรุณาเลือกอาคาร" };
  if (!expense_date) return { error: "กรุณาระบุวันที่" };
  if (amount <= 0) return { error: "กรุณาระบุจำนวนเงินให้ถูกต้อง" };

  const supabase = await createClient();
  const org_id = await getOrgId();
  const { error } = await supabase.from("building_expenses").insert({
    org_id,
    building_id,
    category: String(formData.get("category") ?? "อื่นๆ"),
    amount,
    expense_date,
    note: String(formData.get("note") ?? "").trim(),
  });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function deleteExpense(id: string): Promise<FormState> {
  const supabase = await createClient();
  // .select() เพื่อรู้ว่าลบไปกี่แถว — RLS ไม่ได้ throw error แต่กรองแถวทิ้งเงียบๆ
  const { data, error } = await supabase.from("building_expenses").delete().eq("id", id).select("id");
  if (error) return { error: dbErrorMessage(error.message) };
  if (!data?.length) return { error: NO_ROWS_MESSAGE };
  return { ok: true };
}
