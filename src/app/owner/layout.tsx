import { requirePlatformAdmin } from "@/lib/admin";
import { OwnerSidebar } from "@/components/owner-sidebar";
import { createAdminClient } from "@/lib/supabase/admin";
import { signOut } from "@/app/login/actions";

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePlatformAdmin();

  // จำนวนคำขอชำระเงินที่รอตรวจสอบ (ข้ามทุกกิจการ → ใช้ service role)
  const admin = createAdminClient();
  const { count: pendingCount } = await admin
    .from("subscription_payments")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  return (
    <div className="flex min-h-screen bg-slate-100">
      <OwnerSidebar pendingCount={pendingCount ?? 0} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:px-8">
          <p className="text-sm font-medium text-slate-500">
            แผงเจ้าของระบบ · Chao-Dee
          </p>
          <form action={signOut}>
            <button className="btn-secondary" type="submit">
              ออกจากระบบ
            </button>
          </form>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
