import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";
import { packageBySlug } from "@/lib/packages";
import { formatDate } from "@/lib/format";

export default async function SubscriptionRequired() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, is_platform_admin, organizations(name)")
    .eq("id", user.id)
    .single();

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("package_slug, status, expires_at")
    .eq("org_id", profile?.org_id ?? "")
    .maybeSingle();

  // ยังใช้งานได้ / เป็นแอดมิน → ไม่ต้องมาหน้านี้
  const active =
    sub &&
    ["active", "trialing"].includes(sub.status) &&
    (!sub.expires_at || new Date(sub.expires_at) > new Date());
  if (active || profile?.is_platform_admin) redirect("/dashboard");

  const orgName = (profile?.organizations as { name?: string } | null)?.name ?? "หอพักของคุณ";
  const pkg = packageBySlug(sub?.package_slug ?? "");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-slate-100 p-4">
      <div className="card w-full max-w-md p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-3xl">
          ⏳
        </div>
        <h1 className="mt-4 text-xl font-bold text-slate-900">แพ็คเกจหมดอายุแล้ว</h1>
        <p className="mt-2 text-sm text-slate-500">
          บัญชี <span className="font-medium text-slate-700">{orgName}</span> ต่ออายุแพ็คเกจ
          {pkg ? ` ${pkg.name}` : ""} เพื่อกลับมาใช้งานระบบได้เต็มรูปแบบ
        </p>
        {sub?.expires_at && (
          <p className="mt-1 text-xs text-slate-400">หมดอายุเมื่อ {formatDate(sub.expires_at)}</p>
        )}

        <div className="mt-6 flex flex-col gap-3">
          <a href="/renew" className="btn-primary w-full">
            ต่ออายุตอนนี้
          </a>
          <a href="mailto:support@chao-dee.com" className="btn-secondary w-full">
            ✉️ ติดต่อทีมงาน
          </a>
        </div>

        <form action={signOut} className="mt-4">
          <button className="text-sm text-slate-400 hover:text-slate-600" type="submit">
            ออกจากระบบ
          </button>
        </form>
      </div>
    </div>
  );
}
