import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, isEmailConfigured } from "@/lib/email";
import { monthlySummaryEmail } from "@/lib/email-templates";
import { formatPeriod } from "@/lib/format";

export const runtime = "nodejs";

/**
 * Cron รายเดือน (ตั้งใน vercel.json — วันที่ 1 ของทุกเดือน):
 * ส่งอีเมลสรุปผลประกอบการของเดือนที่เพิ่งจบให้เจ้าของหอที่มีอีเมล
 * ป้องกันด้วย Authorization: Bearer ${CRON_SECRET} (fail-closed)
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("unauthorized", { status: 401 });
  }
  if (!isEmailConfigured()) return NextResponse.json({ ok: true, skipped: "email not configured" });

  const admin = createAdminClient();
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const period = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
  const monthStart = `${period}-01`;
  const next = new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
  const monthEnd = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-01`;

  const [{ data: invoices }, { data: expenses }, { data: rooms }, { data: owners }] = await Promise.all([
    admin.from("invoices").select("org_id, total_amount, paid_amount, status").eq("period", period).neq("status", "void"),
    admin.from("building_expenses").select("org_id, amount").gte("expense_date", monthStart).lt("expense_date", monthEnd),
    admin.from("rooms").select("status, buildings!inner(org_id)"),
    admin.from("profiles").select("org_id, email, organizations(name)").eq("role", "owner"),
  ]);

  type Agg = {
    invoiceCount: number; collected: number; outstanding: number; unpaidCount: number;
    occupied: number; totalRooms: number; expenses: number;
  };
  const byOrg = new Map<string, Agg>();
  const get = (id: string) => {
    let a = byOrg.get(id);
    if (!a) { a = { invoiceCount: 0, collected: 0, outstanding: 0, unpaidCount: 0, occupied: 0, totalRooms: 0, expenses: 0 }; byOrg.set(id, a); }
    return a;
  };

  for (const inv of invoices ?? []) {
    const a = get(inv.org_id);
    a.invoiceCount++;
    const out = Number(inv.total_amount) - Number(inv.paid_amount);
    a.collected += Number(inv.paid_amount);
    if (out > 0) { a.outstanding += out; a.unpaidCount++; }
  }
  for (const e of expenses ?? []) get(e.org_id).expenses += Number(e.amount);
  for (const r of rooms ?? []) {
    const b = Array.isArray(r.buildings) ? r.buildings[0] : r.buildings;
    const orgId = (b as { org_id?: string } | null)?.org_id;
    if (!orgId) continue;
    const a = get(orgId);
    a.totalRooms++;
    if (r.status === "occupied") a.occupied++;
  }

  const ownerMap = new Map((owners ?? []).map((o) => [o.org_id, o]));
  const periodLabel = formatPeriod(period);
  let sent = 0;

  for (const [orgId, a] of byOrg) {
    if (a.invoiceCount === 0) continue; // ส่งเฉพาะหอที่มีบิลในเดือนนั้น
    const owner = ownerMap.get(orgId) as { email?: string; organizations?: { name?: string } | { name?: string }[] } | undefined;
    if (!owner?.email) continue;
    const org = Array.isArray(owner.organizations) ? owner.organizations[0] : owner.organizations;
    const tpl = monthlySummaryEmail({
      orgName: org?.name ?? "หอพักของคุณ",
      periodLabel,
      invoiceCount: a.invoiceCount,
      collected: a.collected,
      outstanding: a.outstanding,
      unpaidCount: a.unpaidCount,
      occupied: a.occupied,
      totalRooms: a.totalRooms,
      expenses: a.expenses,
      net: a.collected - a.expenses,
    });
    const res = await sendEmail({ to: owner.email, subject: tpl.subject, html: tpl.html });
    if (res.ok) sent++;
  }

  return NextResponse.json({ ok: true, period, orgs: byOrg.size, sent });
}
