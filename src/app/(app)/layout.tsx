import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";
import { NavProgress } from "@/components/nav-progress";
import { signOut } from "@/app/login/actions";
import { getMyAccess } from "@/lib/access";
import { canAccessModule } from "@/lib/permissions";

// module = key permission catalog (ซ่อนตามสิทธิ์ทีมงาน) · ไม่มี module = แสดงเสมอ
const MOBILE_NAV = [
  { href: "/reports", label: "แดชบอร์ด/รายงาน" },
  { href: "/buildings", label: "อาคาร", module: "buildings" },
  { href: "/rooms", label: "ห้อง", module: "rooms" },
  { href: "/floorplan", label: "ผังห้อง", module: "rooms" },
  { href: "/tenants", label: "ผู้เช่า", module: "tenants" },
  { href: "/contracts", label: "สัญญา", module: "contracts" },
  { href: "/meters", label: "มิเตอร์", module: "meters" },
  { href: "/invoices", label: "บิล", module: "invoices" },
  { href: "/listing", label: "ลงประกาศ" },
  { href: "/announcements", label: "ประกาศ", module: "announcements" },
  { href: "/maintenance", label: "แจ้งซ่อม", module: "maintenance" },
  { href: "/parcels", label: "พัสดุ", module: "parcels" },
  { href: "/fees", label: "ค่าจอดรถ/ค่าขยะ", module: "fees" },
  { href: "/agency", label: "ดีลนายหน้า", module: "agency" },
  { href: "/expenses", label: "ค่าใช้จ่าย", module: "expenses" },
  { href: "/renew", label: "ต่ออายุ/อัปเกรด" },
  { href: "/settings", label: "ตั้งค่าและการชำระเงิน", module: "settings" },
  { href: "/help", label: "ช่วยเหลือ" },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, org_id, role, is_platform_admin, organizations(name)")
    .eq("id", user.id)
    .single();

  // บัญชี 'rent' (สมัครผ่าน /rent) ใช้แอปจัดการหอไม่ได้ — ส่งไปพื้นที่ประกาศของตัวเอง
  // แยก query + resilient เผื่อ prod ยังไม่ได้รัน migration 0028 (คอลัมน์ account_type)
  if (profile?.org_id) {
    const { data: orgType } = await supabase
      .from("organizations")
      .select("account_type")
      .eq("id", profile.org_id)
      .maybeSingle();
    if ((orgType as { account_type?: string } | null)?.account_type === "rent") {
      redirect("/rent/manage");
    }
  }

  const orgName =
    (profile?.organizations as { name?: string } | null)?.name ?? "หอพักของฉัน";
  const displayName = profile?.full_name || user.email || "ผู้ใช้";
  const isPlatformAdmin = Boolean(profile?.is_platform_admin);
  const canManageTeam = ["owner", "admin"].includes(profile?.role ?? "");
  // สิทธิ์ละเอียด (custom role) — owner/admin = เต็ม, staff = ตาม role ที่เจ้าของกำหนด
  const access = await getMyAccess();

  // จำนวนงานแจ้งซ่อมที่รอดำเนินการ (แสดงเป็น badge ที่เมนู)
  const { count: openMaintenance } = await supabase
    .from("maintenance_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");

  // บังคับสิทธิ์: กิจการที่แพ็คเกจหมดอายุ/ถูกระงับ → เข้าใช้งานไม่ได้ (แอดมินข้ามได้)
  if (!isPlatformAdmin) {
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("status, expires_at")
      .eq("org_id", profile?.org_id ?? "")
      .maybeSingle();
    const ok =
      sub &&
      ["active", "trialing"].includes(sub.status) &&
      (!sub.expires_at || new Date(sub.expires_at) > new Date());
    if (!ok) redirect("/subscription-required");
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Suspense fallback={null}>
        <NavProgress />
      </Suspense>
      <Sidebar orgName={orgName} canManageTeam={canManageTeam} access={access} openMaintenance={openMaintenance ?? 0} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur md:px-8">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900 md:hidden">
              {orgName}
            </p>
            <p className="hidden text-sm text-slate-500 md:block">
              สวัสดี, <span className="font-medium text-slate-800">{displayName}</span>
            </p>
          </div>
          <form action={signOut}>
            <button className="btn-secondary" type="submit">
              ออกจากระบบ
            </button>
          </form>
        </header>

        {/* mobile nav */}
        <nav className="no-print flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-2 py-2 md:hidden">
          {(canManageTeam
            ? [...MOBILE_NAV, { href: "/team", label: "ทีมงาน" }]
            : MOBILE_NAV
          )
            .filter((item) => !("module" in item) || !item.module || canAccessModule(access, item.module))
            .map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
