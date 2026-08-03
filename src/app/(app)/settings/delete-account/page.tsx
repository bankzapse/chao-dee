import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui";
import { DeleteAccountForm } from "./delete-account-form";

export default async function DeleteAccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ตรวจว่าเป็นเจ้าของที่เป็นสมาชิกคนเดียว (จะลบข้อมูลกิจการทั้งหมดตอนลบบัญชี)
  let isSoloOwner = false;
  if (user) {
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("org_id, role")
      .eq("id", user.id)
      .maybeSingle();
    const orgId = (profile as { org_id?: string } | null)?.org_id;
    const role = (profile as { role?: string } | null)?.role;
    if (orgId && role === "owner") {
      const { count } = await admin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .neq("id", user.id);
      isSoloOwner = (count ?? 0) === 0;
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <Link
        href="/settings"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> กลับไปหน้าตั้งค่า
      </Link>
      <PageHeader title="ลบบัญชี" subtitle="ลบบัญชีและข้อมูลของคุณออกจากระบบถาวร" />
      <DeleteAccountForm isSoloOwner={isSoloOwner} />
    </div>
  );
}
