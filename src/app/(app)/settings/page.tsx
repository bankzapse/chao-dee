import { createClient } from "@/lib/supabase/server";
import { PageHeader, Badge } from "@/components/ui";
import { SettingsForm } from "./settings-form";
import { packageBySlug } from "@/lib/packages";
import {
  formatBaht,
  formatDate,
  SUBSCRIPTION_STATUS_LABEL,
  SUBSCRIPTION_STATUS_STYLE,
} from "@/lib/format";

export default async function SettingsPage() {
  const supabase = await createClient();
  const [{ data: org }, { data: sub }] = await Promise.all([
    supabase
      .from("organizations")
      .select("name, promptpay_id, promptpay_name, invoice_note")
      .single(),
    supabase.from("subscriptions").select("*").maybeSingle(),
  ]);

  const pkg = packageBySlug(sub?.package_slug ?? "");
  const st = sub?.status ?? "expired";

  return (
    <div>
      <PageHeader title="ตั้งค่า" subtitle="ข้อมูลกิจการและการชำระเงิน" />

      {/* แพ็คเกจของฉัน */}
      <div className="card mb-6 flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <p className="text-sm text-slate-500">แพ็คเกจของคุณ</p>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-xl font-bold text-slate-900">{pkg?.name ?? "-"}</p>
            <Badge className={SUBSCRIPTION_STATUS_STYLE[st]}>{SUBSCRIPTION_STATUS_LABEL[st]}</Badge>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {sub?.expires_at ? `ใช้งานได้ถึง ${formatDate(sub.expires_at)}` : ""}
            {sub?.price ? ` · ${formatBaht(sub.price)}/${sub.cycle === "yearly" ? "ปี" : "เดือน"}` : ""}
          </p>
        </div>
        <a href="https://line.me" target="_blank" rel="noreferrer" className="btn-secondary">
          ต่ออายุ / อัปเกรด
        </a>
      </div>

      <SettingsForm
        org={{
          name: org?.name ?? "",
          promptpay_id: org?.promptpay_id ?? "",
          promptpay_name: org?.promptpay_name ?? "",
          invoice_note: org?.invoice_note ?? "",
        }}
      />
    </div>
  );
}
