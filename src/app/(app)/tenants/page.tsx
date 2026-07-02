import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui";
import { DeleteButton } from "@/components/action-form";
import type { Tenant } from "@/lib/types";
import { AddTenantButton, EditTenantButton } from "./tenant-buttons";
import { LineLinkCell } from "./line-link";
import { deleteTenant } from "./actions";

export default async function TenantsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tenants")
    .select("*")
    .order("created_at", { ascending: false });

  const list = (data ?? []) as Tenant[];

  return (
    <div>
      <PageHeader
        title="ผู้เช่า"
        subtitle="จัดการข้อมูลผู้เช่าได้ไม่จำกัด"
        action={<AddTenantButton />}
      />

      {list.length === 0 ? (
        <EmptyState
          title="ยังไม่มีผู้เช่า"
          description="เพิ่มผู้เช่าเพื่อผูกกับสัญญาเช่า"
          action={<AddTenantButton />}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">ชื่อ</th>
                  <th className="px-4 py-3 font-medium">เบอร์โทร</th>
                  <th className="px-4 py-3 font-medium">อีเมล</th>
                  <th className="px-4 py-3 font-medium">บัตรประชาชน</th>
                  <th className="px-4 py-3 font-medium">LINE</th>
                  <th className="px-4 py-3 text-right font-medium">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      👤 {t.full_name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{t.phone || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{t.email || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{t.id_card || "-"}</td>
                    <td className="px-4 py-3">
                      <LineLinkCell
                        tenantId={t.id}
                        linked={Boolean(t.line_user_id)}
                        code={t.line_link_code || ""}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <EditTenantButton tenant={t} />
                        <DeleteButton
                          action={deleteTenant.bind(null, t.id)}
                          confirmText={`ลบผู้เช่า "${t.full_name}"?`}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
