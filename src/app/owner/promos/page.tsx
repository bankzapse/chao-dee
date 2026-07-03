import { requirePlatformAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { formatBaht, formatDate } from "@/lib/format";
import { createPromo } from "./actions";
import { PromoButtons } from "./promo-buttons";

export const metadata = { title: "คูปองส่วนลด" };

type Promo = {
  id: string;
  code: string;
  description: string;
  percent_off: number | null;
  amount_off: number | null;
  active: boolean;
  expires_at: string | null;
  max_uses: number | null;
  used_count: number;
};

export default async function PromosPage() {
  await requirePlatformAdmin();
  const admin = createAdminClient();
  const { data } = await admin
    .from("promo_codes")
    .select("*")
    .order("created_at", { ascending: false });
  const promos = (data ?? []) as Promo[];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">คูปองส่วนลด</h1>
      <p className="mt-1 text-sm text-slate-500">สร้างและจัดการโค้ดส่วนลดค่าแพ็คเกจ</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* สร้าง */}
        <div className="lg:col-span-1">
          <div className="card p-5">
            <h2 className="mb-3 font-semibold text-slate-900">สร้างคูปองใหม่</h2>
            <ActionForm action={createPromo} submitLabel="สร้างคูปอง">
              <div>
                <label className="label">โค้ด</label>
                <input name="code" className="field uppercase" placeholder="NEWYEAR2026" required />
              </div>
              <div>
                <label className="label">คำอธิบาย</label>
                <input name="description" className="field" placeholder="โปรปีใหม่" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">ประเภท</label>
                  <select name="kind" className="field" defaultValue="percent">
                    <option value="percent">เปอร์เซ็นต์ (%)</option>
                    <option value="amount">จำนวนเงิน (บาท)</option>
                  </select>
                </div>
                <div>
                  <label className="label">มูลค่า</label>
                  <input name="value" type="number" min="1" className="field" placeholder="10" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">หมดอายุ (ถ้ามี)</label>
                  <input name="expires_at" type="date" className="field" />
                </div>
                <div>
                  <label className="label">ใช้ได้สูงสุด</label>
                  <input name="max_uses" type="number" min="1" className="field" placeholder="ไม่จำกัด" />
                </div>
              </div>
            </ActionForm>
          </div>
        </div>

        {/* รายการ */}
        <div className="lg:col-span-2">
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-slate-500">
                    <th className="px-4 py-3 font-medium">โค้ด</th>
                    <th className="px-4 py-3 font-medium">ส่วนลด</th>
                    <th className="px-4 py-3 font-medium">ใช้แล้ว</th>
                    <th className="px-4 py-3 font-medium">หมดอายุ</th>
                    <th className="px-4 py-3 font-medium">สถานะ</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {promos.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5">
                        <p className="font-semibold text-slate-900">{p.code}</p>
                        {p.description && <p className="text-xs text-slate-400">{p.description}</p>}
                      </td>
                      <td className="px-4 py-2.5 text-slate-700">
                        {p.percent_off ? `${p.percent_off}%` : formatBaht(Number(p.amount_off ?? 0))}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500">
                        {p.used_count}
                        {p.max_uses ? ` / ${p.max_uses}` : ""}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500">
                        {p.expires_at ? formatDate(p.expires_at) : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge className={p.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}>
                          {p.active ? "ใช้งาน" : "ปิด"}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <PromoButtons id={p.id} active={p.active} />
                      </td>
                    </tr>
                  ))}
                  {promos.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                        ยังไม่มีคูปอง
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
