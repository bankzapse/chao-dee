import { requireOwner } from "@/lib/admin";
import { ADMIN_SECTIONS } from "@/lib/admin-sections";
import { createAdminClient } from "@/lib/supabase/admin";
import { DeleteButton } from "@/components/action-form";
import { formatDate } from "@/lib/format";
import { CreateAdminButton, EditPermsButton } from "./admin-buttons";
import { deleteAdmin } from "./actions";

const permLabel = (key: string) => ADMIN_SECTIONS.find((s) => s.key === key)?.label ?? key;

export default async function OwnerAdmins() {
  await requireOwner();
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id, full_name, phone, admin_role, admin_perms, created_at")
    .in("admin_role", ["owner", "admin"])
    .order("created_at", { ascending: true });

  const list = data ?? [];
  const owners = list.filter((a) => a.admin_role === "owner");
  const admins = list.filter((a) => a.admin_role === "admin");

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">จัดการแอดมิน</h1>
          <p className="mt-1 text-sm text-slate-500">สร้างบัญชีแอดมินและกำหนดสิทธิ์เข้าถึงแต่ละหน้า</p>
        </div>
        <CreateAdminButton />
      </div>

      {/* เจ้าของระบบ */}
      <h2 className="mb-2 mt-6 text-sm font-semibold text-slate-500">เจ้าของระบบ (สิทธิ์เต็ม)</h2>
      <div className="card divide-y divide-slate-100">
        {owners.map((o) => (
          <div key={o.id} className="flex items-center justify-between px-5 py-3">
            <div>
              <p className="font-medium text-slate-900">🛡️ {o.full_name || "-"}</p>
              <p className="text-xs text-slate-400">{o.phone || "-"}</p>
            </div>
            <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-700">เจ้าของระบบ</span>
          </div>
        ))}
      </div>

      {/* แอดมิน */}
      <h2 className="mb-2 mt-8 text-sm font-semibold text-slate-500">แอดมิน ({admins.length})</h2>
      {admins.length === 0 ? (
        <div className="card p-6 text-sm text-slate-500">ยังไม่มีแอดมิน — กด “เพิ่มแอดมิน” เพื่อสร้างบัญชีและกำหนดสิทธิ์</div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">ชื่อ</th>
                  <th className="px-4 py-3 font-medium">เบอร์ (ล็อกอิน)</th>
                  <th className="px-4 py-3 font-medium">สิทธิ์</th>
                  <th className="px-4 py-3 font-medium">สร้างเมื่อ</th>
                  <th className="px-4 py-3 text-right font-medium">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {admins.map((a) => {
                  const perms = (a.admin_perms as string[]) ?? [];
                  return (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{a.full_name || "-"}</td>
                      <td className="px-4 py-3 text-slate-600">{a.phone || "-"}</td>
                      <td className="px-4 py-3">
                        {perms.length === 0 ? (
                          <span className="text-xs text-slate-400">ยังไม่ได้ให้สิทธิ์</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {perms.map((p) => (
                              <span key={p} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                                {permLabel(p)}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(a.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-3">
                          <EditPermsButton userId={a.id} name={a.full_name || "แอดมิน"} perms={perms} />
                          <DeleteButton
                            action={deleteAdmin.bind(null, a.id)}
                            confirmText={`ลบแอดมิน "${a.full_name || ""}"? บัญชีจะเข้าระบบไม่ได้อีก`}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
