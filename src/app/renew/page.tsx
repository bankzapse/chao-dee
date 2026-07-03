import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui";
import { RenewForm } from "./renew-form";
import { packageBySlug } from "@/lib/packages";
import {
  formatBaht,
  formatDate,
  SUBSCRIPTION_STATUS_LABEL,
  SUBSCRIPTION_STATUS_STYLE,
} from "@/lib/format";

export default async function RenewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, organizations(name)")
    .eq("id", user.id)
    .single();

  const [{ data: sub }, { data: pending }] = await Promise.all([
    supabase.from("subscriptions").select("*").eq("org_id", profile?.org_id ?? "").maybeSingle(),
    supabase
      .from("subscription_payments")
      .select("*")
      .eq("org_id", profile?.org_id ?? "")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const orgName = (profile?.organizations as { name?: string } | null)?.name ?? "หอพักของคุณ";
  const st = sub?.status ?? "expired";
  const platformPromptPay = process.env.NEXT_PUBLIC_PLATFORM_PROMPTPAY ?? "";

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white">ช</div>
            <span className="font-bold text-slate-900">ChaoDee</span>
          </Link>
          <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-700">
            ← กลับแดชบอร์ด
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-2xl font-bold text-slate-900">ต่ออายุ / อัปเกรดแพ็คเกจ</h1>
        <p className="mt-1 text-sm text-slate-500">{orgName}</p>

        {/* สถานะปัจจุบัน */}
        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <span className="text-sm text-slate-500">แพ็คเกจปัจจุบัน:</span>
          <span className="font-semibold text-slate-900">{packageBySlug(sub?.package_slug ?? "")?.name ?? "-"}</span>
          <Badge className={SUBSCRIPTION_STATUS_STYLE[st]}>{SUBSCRIPTION_STATUS_LABEL[st]}</Badge>
          {sub?.expires_at && <span className="text-sm text-slate-400">หมดอายุ {formatDate(sub.expires_at)}</span>}
        </div>

        <div className="mt-6 card p-6">
          <RenewForm platformPromptPay={platformPromptPay} defaultSlug={sub?.package_slug} />
        </div>

        {/* คำขอล่าสุด */}
        {(pending ?? []).length > 0 && (
          <div className="mt-6">
            <h2 className="mb-3 font-semibold text-slate-900">คำขอ/การชำระล่าสุด</h2>
            <div className="card divide-y divide-slate-100">
              {(pending ?? []).map((p) => (
                <div key={p.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <div>
                    <span className="font-medium text-slate-900">
                      {packageBySlug(p.package_slug)?.name} · {p.cycle === "yearly" ? "รายปี" : "รายเดือน"}
                    </span>
                    <span className="ml-2 text-slate-500">{formatBaht(p.amount)}</span>
                    <span className="ml-2 text-xs text-slate-400">{formatDate(p.paid_at)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {p.status === "verified" && (
                      <Link
                        href={`/renew/receipt/${p.id}`}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                      >
                        ใบเสร็จ
                      </Link>
                    )}
                    <Badge
                      className={
                        p.status === "verified"
                          ? "bg-emerald-100 text-emerald-700"
                          : p.status === "rejected"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-amber-100 text-amber-700"
                      }
                    >
                      {p.status === "verified" ? "เปิดสิทธิ์แล้ว" : p.status === "rejected" ? "ไม่ผ่าน" : "รอตรวจสอบ"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
