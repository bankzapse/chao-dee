import { isPlatformAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { packageBySlug } from "@/lib/packages";
import { toCsv, csvResponse } from "@/lib/csv";

export const runtime = "nodejs";

/** ดาวน์โหลดรายงานเป็น CSV — /owner/reports/export?type=members|payments|subscriptions */
export async function GET(req: Request) {
  if (!(await isPlatformAdmin())) {
    return new Response("unauthorized", { status: 401 });
  }
  const type = new URL(req.url).searchParams.get("type") ?? "subscriptions";
  const admin = createAdminClient();

  if (type === "payments") {
    const { data } = await admin
      .from("subscription_payments")
      .select("paid_at, org_id, package_slug, cycle, amount, method, status, organizations(name)")
      .order("paid_at", { ascending: false });
    const rows = (data ?? []).map((p) => ({
      paid_at: p.paid_at,
      org: (p.organizations as { name?: string } | null)?.name ?? p.org_id,
      package: packageBySlug(p.package_slug)?.name ?? p.package_slug,
      cycle: p.cycle === "yearly" ? "รายปี" : "รายเดือน",
      amount: Number(p.amount),
      method: p.method,
      status: p.status,
    }));
    return csvResponse(
      toCsv(rows, [
        { key: "paid_at", header: "วันที่" },
        { key: "org", header: "กิจการ" },
        { key: "package", header: "แพ็คเกจ" },
        { key: "cycle", header: "รอบ" },
        { key: "amount", header: "จำนวนเงิน" },
        { key: "method", header: "ช่องทาง" },
        { key: "status", header: "สถานะ" },
      ]),
      `chaodee-payments-${new Date().toISOString().slice(0, 10)}.csv`
    );
  }

  if (type === "members") {
    const { data } = await admin
      .from("profiles")
      .select("full_name, phone, role, organizations(name)")
      .eq("role", "owner")
      .order("created_at", { ascending: false });
    const rows = (data ?? []).map((m) => ({
      org: (m.organizations as { name?: string } | null)?.name ?? "-",
      owner: m.full_name,
      phone: m.phone,
    }));
    return csvResponse(
      toCsv(rows, [
        { key: "org", header: "กิจการ" },
        { key: "owner", header: "เจ้าของ" },
        { key: "phone", header: "เบอร์โทร" },
      ]),
      `chaodee-members-${new Date().toISOString().slice(0, 10)}.csv`
    );
  }

  // subscriptions (ค่าเริ่มต้น)
  const { data } = await admin
    .from("subscriptions")
    .select("package_slug, cycle, status, price, expires_at, organizations(name)")
    .order("expires_at", { ascending: true });
  const rows = (data ?? []).map((s) => ({
    org: (s.organizations as { name?: string } | null)?.name ?? "-",
    package: packageBySlug(s.package_slug)?.name ?? s.package_slug,
    cycle: s.cycle === "yearly" ? "รายปี" : "รายเดือน",
    status: s.status,
    price: Number(s.price),
    expires_at: s.expires_at ? String(s.expires_at).slice(0, 10) : "",
  }));
  return csvResponse(
    toCsv(rows, [
      { key: "org", header: "กิจการ" },
      { key: "package", header: "แพ็คเกจ" },
      { key: "cycle", header: "รอบ" },
      { key: "status", header: "สถานะ" },
      { key: "price", header: "ราคา" },
      { key: "expires_at", header: "หมดอายุ" },
    ]),
    `chaodee-subscriptions-${new Date().toISOString().slice(0, 10)}.csv`
  );
}
