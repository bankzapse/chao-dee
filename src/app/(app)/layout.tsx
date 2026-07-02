import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";
import { signOut } from "@/app/login/actions";

const MOBILE_NAV = [
  { href: "/dashboard", label: "แดชบอร์ด" },
  { href: "/reports", label: "รายงาน" },
  { href: "/buildings", label: "อาคาร" },
  { href: "/rooms", label: "ห้อง" },
  { href: "/floorplan", label: "ผังห้อง" },
  { href: "/tenants", label: "ผู้เช่า" },
  { href: "/contracts", label: "สัญญา" },
  { href: "/meters", label: "มิเตอร์" },
  { href: "/invoices", label: "บิล" },
  { href: "/announcements", label: "ประกาศ" },
  { href: "/maintenance", label: "แจ้งซ่อม" },
  { href: "/parcels", label: "พัสดุ" },
  { href: "/vehicles", label: "ยานพาหนะ" },
  { href: "/expenses", label: "ค่าใช้จ่าย" },
  { href: "/settings", label: "ตั้งค่า" },
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
    .select("full_name, org_id, organizations(name)")
    .eq("id", user.id)
    .single();

  const orgName =
    (profile?.organizations as { name?: string } | null)?.name ?? "หอพักของฉัน";
  const displayName = profile?.full_name || user.email || "ผู้ใช้";

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar orgName={orgName} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur md:px-8">
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
        <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-2 py-2 md:hidden">
          {MOBILE_NAV.map((item) => (
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
