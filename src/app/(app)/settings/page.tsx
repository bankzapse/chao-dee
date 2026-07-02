import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("name, promptpay_id, promptpay_name, invoice_note")
    .single();

  return (
    <div>
      <PageHeader title="ตั้งค่า" subtitle="ข้อมูลกิจการและการชำระเงิน" />
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
