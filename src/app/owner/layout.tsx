import { requirePlatformAdmin } from "@/lib/admin";
import { OwnerSidebar } from "@/components/owner-sidebar";
import { signOut } from "@/app/login/actions";

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePlatformAdmin();

  return (
    <div className="flex min-h-screen bg-slate-100">
      <OwnerSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:px-8">
          <p className="text-sm font-medium text-slate-500">
            แผงเจ้าของระบบ · ChaoDee
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
