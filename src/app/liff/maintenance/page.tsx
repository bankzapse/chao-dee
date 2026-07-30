import { redirect } from "next/navigation";
import { getLiffTenant } from "@/lib/liff";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate, MAINTENANCE_STATUS_LABEL, MAINTENANCE_STATUS_STYLE } from "@/lib/format";
import type { MaintenanceStatus } from "@/lib/types";
import { LiffHeader } from "../liff-header";
import { ReportForm } from "./report-form";

export default async function LiffMaintenance() {
  const tenant = await getLiffTenant();
  if (!tenant) redirect("/liff/link");

  const admin = createAdminClient();
  const { data } = await admin
    .from("maintenance_requests")
    .select("id, title, description, status, photo_url, created_at")
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false })
    .limit(20);
  const reqs = data ?? [];

  return (
    <div>
      <LiffHeader title="แจ้งซ่อม" />
      <ReportForm />

      {reqs.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-sm font-medium text-slate-500">รายการที่แจ้งไว้</p>
          <div className="space-y-2.5">
            {reqs.map((r) => (
              <div key={r.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{r.title}</p>
                    {r.description && (
                      <p className="mt-0.5 text-sm text-slate-500">{r.description}</p>
                    )}
                    <p className="mt-1 text-xs text-slate-400">{formatDate(r.created_at)}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                      MAINTENANCE_STATUS_STYLE[r.status as MaintenanceStatus]
                    }`}
                  >
                    {MAINTENANCE_STATUS_LABEL[r.status as MaintenanceStatus]}
                  </span>
                </div>
                {r.photo_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.photo_url}
                    alt="รูปแจ้งซ่อม"
                    className="mt-2 h-40 w-full rounded-lg object-cover ring-1 ring-slate-200"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
