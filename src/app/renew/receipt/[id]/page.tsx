import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { packageBySlug } from "@/lib/packages";
import { formatBaht, formatDate } from "@/lib/format";
import { PrintButton } from "./print-button";
import { COMPANY } from "@/lib/company";

export const metadata = { title: "ใบเสร็จรับเงิน", robots: { index: false } };

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, full_name, organizations(name)")
    .eq("id", user.id)
    .single();

  // RLS จำกัดให้เห็นเฉพาะของ org ตัวเองอยู่แล้ว
  const { data: pay } = await supabase
    .from("subscription_payments")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!pay) notFound();
  if (pay.status !== "verified") {
    // ยังไม่ยืนยัน → ยังออกใบเสร็จไม่ได้
    redirect("/renew");
  }

  const orgName = (profile?.organizations as { name?: string } | null)?.name ?? "-";
  const pkg = packageBySlug(pay.package_slug);
  const receiptNo = `CD-${String(pay.id).slice(0, 8).toUpperCase()}`;
  const amount = Number(pay.amount);

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      <div className="mx-auto max-w-2xl px-4 print:max-w-none print:px-0">
        <div className="mb-4 flex items-center justify-between print:hidden">
          <Link href="/renew" className="text-sm text-slate-500 hover:text-slate-700">
            ← กลับ
          </Link>
          <PrintButton />
        </div>

        <div className="rounded-2xl bg-white p-10 shadow-sm print:rounded-none print:shadow-none">
          {/* หัวใบเสร็จ */}
          <div className="flex items-start justify-between border-b border-slate-200 pb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-xl font-bold text-white">
                ช
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">ChaoDee (เช่าดี)</p>
                <p className="text-xs text-slate-600">
                  โดย {COMPANY.name} · เลขประจำตัวผู้เสียภาษี {COMPANY.taxId}
                </p>
                <p className="text-xs text-slate-400">{COMPANY.address}</p>
                <p className="text-xs text-slate-400">chao-dee.com · {COMPANY.email}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-slate-900">ใบเสร็จรับเงิน</p>
              <p className="text-xs text-slate-500">RECEIPT</p>
              <p className="mt-2 text-sm font-medium text-slate-700">เลขที่ {receiptNo}</p>
            </div>
          </div>

          {/* ผู้รับ + วันที่ */}
          <div className="grid grid-cols-2 gap-6 py-6 text-sm">
            <div>
              <p className="text-slate-400">ลูกค้า</p>
              <p className="mt-1 font-medium text-slate-900">{orgName}</p>
              {profile?.full_name && <p className="text-slate-500">{profile.full_name}</p>}
            </div>
            <div className="text-right">
              <p className="text-slate-400">วันที่ชำระ</p>
              <p className="mt-1 font-medium text-slate-900">{formatDate(pay.paid_at)}</p>
              {pay.verified_at && (
                <p className="text-xs text-slate-400">ยืนยันเมื่อ {formatDate(pay.verified_at)}</p>
              )}
            </div>
          </div>

          {/* รายการ */}
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-y border-slate-200 text-left text-slate-500">
                <th className="py-2 font-medium">รายการ</th>
                <th className="py-2 text-right font-medium">จำนวนเงิน</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-3 text-slate-800">
                  แพ็คเกจ {pkg?.name ?? pay.package_slug} —{" "}
                  {pay.cycle === "yearly" ? "รายปี" : "รายเดือน"}
                  {pay.period_start && pay.period_end && (
                    <span className="block text-xs text-slate-400">
                      รอบ {formatDate(pay.period_start)} – {formatDate(pay.period_end)}
                    </span>
                  )}
                </td>
                <td className="py-3 text-right text-slate-800">{formatBaht(amount)}</td>
              </tr>
            </tbody>
          </table>

          {/* รวม */}
          <div className="mt-4 flex justify-end">
            <div className="w-56 space-y-1 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>ยอดรวม</span>
                <span>{formatBaht(amount)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
                <span>รวมทั้งสิ้น</span>
                <span>{formatBaht(amount)}</span>
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-lg bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-700 print:bg-white">
            ✓ ชำระเงินเรียบร้อยแล้ว
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            เอกสารนี้ออกโดยระบบอัตโนมัติ · ชำระผ่าน {pay.method === "promptpay" ? "PromptPay" : "โอนเงิน"}
          </p>
        </div>
      </div>
    </div>
  );
}
