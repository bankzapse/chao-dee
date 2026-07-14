import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState, Badge } from "@/components/ui";
import { DeleteButton } from "@/components/action-form";
import { formatDate } from "@/lib/format";
import { LEAD_STATUS_LABEL, LEAD_STATUS_STYLE } from "@/lib/listings";
import type { LeadStatus } from "@/lib/types";
import { LeadStatusSelect } from "./lead-controls";
import { Pagination, parsePage } from "@/components/pagination";
import { deleteLead } from "../actions";

const PAGE_SIZE = 30;

type LeadRow = {
  id: string;
  name: string;
  phone: string;
  message: string;
  source: string;
  status: LeadStatus;
  created_at: string;
  property_listings: { title: string; slug: string } | null;
};

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = parsePage((await searchParams).page);
  const supabase = await createClient();
  const { data, count } = await supabase
    .from("listing_leads")
    .select("id, name, phone, message, source, status, created_at, property_listings(title, slug)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const leads = (data ?? []) as unknown as LeadRow[];
  const total = count ?? 0;

  return (
    <div>
      <PageHeader
        title="ผู้ติดต่อจากประกาศ"
        subtitle="ผู้เช่าที่สนใจและติดต่อผ่านหน้าเว็บ Chao-Dee"
        action={
          <Link href="/listing" className="btn-secondary">
            ← กลับไปประกาศ
          </Link>
        }
      />

      {leads.length === 0 ? (
        <EmptyState
          title="ยังไม่มีผู้ติดต่อ"
          description="เมื่อมีผู้เช่ากรอกฟอร์มติดต่อจากหน้าประกาศ รายชื่อจะแสดงที่นี่ พร้อมแจ้งเตือนทาง LINE"
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">ผู้ติดต่อ</th>
                  <th className="px-4 py-3 font-medium">ประกาศ</th>
                  <th className="px-4 py-3 font-medium">ข้อความ</th>
                  <th className="px-4 py-3 font-medium">วันที่</th>
                  <th className="px-4 py-3 font-medium">สถานะ</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{l.name || "-"}</p>
                      <a href={`tel:${l.phone}`} className="text-indigo-600 hover:text-indigo-700">
                        {l.phone || "-"}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{l.property_listings?.title ?? "-"}</td>
                    <td className="px-4 py-3 max-w-xs text-slate-500">
                      {l.message ? l.message : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(l.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Badge className={LEAD_STATUS_STYLE[l.status]}>
                          {LEAD_STATUS_LABEL[l.status]}
                        </Badge>
                        <LeadStatusSelect leadId={l.id} status={l.status} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DeleteButton action={deleteLead.bind(null, l.id)} confirmText="ลบผู้ติดต่อนี้?" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination basePath="/listing/leads" page={page} pageSize={PAGE_SIZE} total={total} />
        </div>
      )}
    </div>
  );
}
