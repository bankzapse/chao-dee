import { redirect } from "next/navigation";
import { getLiffTenant } from "@/lib/liff";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/format";
import { LiffHeader } from "../liff-header";

export default async function LiffParcels() {
  const tenant = await getLiffTenant();
  if (!tenant) redirect("/liff/link");

  const admin = createAdminClient();
  const { data } = await admin
    .from("parcels")
    .select("id, carrier, tracking_no, status, received_at, picked_up_at")
    .eq("tenant_id", tenant.id)
    .order("received_at", { ascending: false })
    .limit(30);
  const parcels = data ?? [];
  const waiting = parcels.filter((p) => p.status !== "picked_up");

  return (
    <div>
      <LiffHeader title="พัสดุ" />
      {parcels.length === 0 ? (
        <p className="rounded-2xl bg-white p-8 text-center text-sm text-slate-400 ring-1 ring-slate-100">
          ยังไม่มีพัสดุ
        </p>
      ) : (
        <>
          {waiting.length > 0 && (
            <p className="mb-3 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">
              📦 มีพัสดุรอรับ {waiting.length} ชิ้น
            </p>
          )}
          <div className="space-y-2.5">
            {parcels.map((p) => (
              <div
                key={p.id}
                className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900">{p.carrier || "พัสดุ"}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      p.status === "picked_up"
                        ? "bg-slate-100 text-slate-500"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {p.status === "picked_up" ? "รับแล้ว" : "รอรับ"}
                  </span>
                </div>
                {p.tracking_no && (
                  <p className="mt-1 text-xs text-slate-400">เลขพัสดุ {p.tracking_no}</p>
                )}
                <p className="mt-1 text-xs text-slate-400">
                  มาถึง {formatDate(p.received_at)}
                  {p.picked_up_at ? ` · รับแล้ว ${formatDate(p.picked_up_at)}` : ""}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
