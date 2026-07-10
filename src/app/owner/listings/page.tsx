import { requirePerm } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { StatCard, Badge } from "@/components/ui";
import { formatBaht, formatDate } from "@/lib/format";
import type { PromoStatus } from "@/lib/types";
import { ApprovePromotionButton, RejectPromotionButton } from "../promotion-actions";

type PromoRow = {
  id: string;
  org_id: string;
  days: number;
  amount: number;
  slip_path: string;
  status: PromoStatus;
  expires_at: string | null;
  created_at: string;
  organizations: { name: string } | null;
  property_listings: { title: string; slug: string } | null;
};

const STATUS = {
  pending: { label: "รออนุมัติ", cls: "bg-amber-100 text-amber-700" },
  active: { label: "โปรโมทอยู่", cls: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "ปฏิเสธ", cls: "bg-rose-100 text-rose-700" },
} as const;

export default async function OwnerListings() {
  await requirePerm("promotions");
  const admin = createAdminClient();
  const { data } = await admin
    .from("listing_promotions")
    .select("*, organizations(name), property_listings(title, slug)")
    .order("created_at", { ascending: false });

  const list = (data ?? []) as unknown as PromoRow[];

  const slipUrls = new Map<string, string>();
  for (const p of list) {
    if (p.slip_path) {
      const { data: signed } = await admin.storage.from("slips").createSignedUrl(p.slip_path, 60 * 60);
      if (signed?.signedUrl) slipUrls.set(p.id, signed.signedUrl);
    }
  }

  const pending = list.filter((p) => p.status === "pending");
  const active = list.filter((p) => p.status === "active");
  const revenue = list
    .filter((p) => p.status === "active")
    .reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">โปรโมทประกาศ</h1>
      <p className="mt-1 text-sm text-slate-500">อนุมัติคำขอซื้อโปรโมท (Featured) เพื่อดันประกาศขึ้นบนสุด</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="รออนุมัติ" value={String(pending.length)} accent="amber" />
        <StatCard label="กำลังโปรโมท" value={String(active.length)} accent="emerald" />
        <StatCard label="รายได้โปรโมท (อนุมัติแล้ว)" value={formatBaht(revenue)} accent="emerald" />
      </div>

      <div className="mt-6 card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">วันที่</th>
                <th className="px-4 py-3 font-medium">สมาชิก</th>
                <th className="px-4 py-3 font-medium">ประกาศ</th>
                <th className="px-4 py-3 font-medium">ระยะเวลา</th>
                <th className="px-4 py-3 text-right font-medium">จำนวน</th>
                <th className="px-4 py-3 font-medium">สถานะ</th>
                <th className="px-4 py-3 text-right font-medium">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    ยังไม่มีคำขอโปรโมท
                  </td>
                </tr>
              )}
              {list.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">{formatDate(p.created_at)}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {p.organizations?.name ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{p.property_listings?.title ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {p.days} วัน
                    {p.status === "active" && p.expires_at && (
                      <span className="block text-xs text-slate-400">ถึง {formatDate(p.expires_at)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    {formatBaht(p.amount)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={STATUS[p.status].cls}>{STATUS[p.status].label}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      {slipUrls.has(p.id) && (
                        <a
                          href={slipUrls.get(p.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                        >
                          🧾 ดูสลิป
                        </a>
                      )}
                      {p.status === "pending" && (
                        <>
                          <ApprovePromotionButton id={p.id} />
                          <RejectPromotionButton id={p.id} />
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
