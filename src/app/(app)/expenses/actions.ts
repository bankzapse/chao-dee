"use server";

import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/auth";
import { money } from "@/lib/num";
import type { FormState } from "@/components/action-form";

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

export async function deleteExpense(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("building_expenses").delete().eq("id", id);
}
