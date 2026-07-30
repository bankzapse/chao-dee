import { redirect } from "next/navigation";
import { getLiffTenant } from "@/lib/liff";
import { createAdminClient } from "@/lib/supabase/admin";
import { toLocalThai } from "@/lib/phone";
import { LiffHeader } from "../liff-header";

export default async function LiffContact() {
  const tenant = await getLiffTenant();
  if (!tenant) redirect("/liff/link");

  const admin = createAdminClient();
  const [{ data: org }, { data: owner }] = await Promise.all([
    admin.from("organizations").select("name").eq("id", tenant.org_id).maybeSingle(),
    admin
      .from("profiles")
      .select("phone")
      .eq("org_id", tenant.org_id)
      .eq("role", "owner")
      .maybeSingle(),
  ]);

  const phoneRaw = (owner as { phone?: string } | null)?.phone ?? "";
  const phone = phoneRaw ? toLocalThai(phoneRaw) : "";

  return (
    <div>
      <LiffHeader title="ติดต่อผู้ดูแล" />

      <div className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-100">
        <p className="text-sm text-slate-400">หอพัก</p>
        <p className="mt-0.5 text-xl font-bold text-slate-900">{org?.name ?? "หอพัก"}</p>

        {phone ? (
          <>
            <p className="mt-6 text-sm text-slate-400">เบอร์โทรผู้ดูแล</p>
            <p className="mt-0.5 text-2xl font-bold tracking-wide text-slate-900">{phone}</p>
            <a
              href={`tel:${phone}`}
              className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 py-3.5 text-base font-semibold text-white active:scale-95"
            >
              โทรหาผู้ดูแล
            </a>
          </>
        ) : (
          <p className="mt-6 text-sm text-slate-500">
            ยังไม่มีเบอร์ติดต่อในระบบ
            <br />
            กรุณาติดต่อที่สำนักงานหอพัก
          </p>
        )}
      </div>

      <p className="mt-4 rounded-2xl bg-white p-4 text-center text-sm text-slate-500 shadow-sm ring-1 ring-slate-100">
        เรื่องแจ้งซ่อมหรือพัสดุ แนะนำให้ใช้เมนูในแอปเพื่อให้ติดตามสถานะได้ 🙂
      </p>
    </div>
  );
}
