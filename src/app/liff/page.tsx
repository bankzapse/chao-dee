import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ReceiptText,
  Wrench,
  Package,
  Wallet,
  Phone,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { getLiffTenant } from "@/lib/liff";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatBaht } from "@/lib/format";
import { IconBadge, type IconTone } from "@/components/icon-badge";

export default async function LiffHome() {
  // เซสชัน + liff.init() จัดการที่ layout (LiffBoot) แล้ว — ที่นี่แค่เช็คว่าผูกบัญชีหรือยัง
  const tenant = await getLiffTenant();
  if (!tenant) redirect("/liff/link");

  const admin = createAdminClient();
  // ดึงข้อมูลสรุปแบบขนาน: บิล / พัสดุ / งานซ่อม / ชื่อหอ
  const [invRes, parcelRes, maintRes, orgRes] = await Promise.all([
    admin.from("invoices").select("total_amount, paid_amount").eq("tenant_id", tenant.id).neq("status", "void"),
    admin.from("parcels").select("status").eq("tenant_id", tenant.id).neq("status", "picked_up"),
    admin.from("maintenance_requests").select("status").eq("tenant_id", tenant.id).in("status", ["open", "in_progress"]),
    admin.from("organizations").select("name").eq("id", tenant.org_id).maybeSingle(),
  ]);

  const invoices = invRes.data ?? [];
  const outstanding = invoices.reduce((s, i) => s + (Number(i.total_amount) - Number(i.paid_amount)), 0);
  const unpaidCount = invoices.filter((i) => Number(i.total_amount) - Number(i.paid_amount) > 0).length;
  const waitingParcels = (parcelRes.data ?? []).length;
  const activeReqs = (maintRes.data ?? []).length;
  const orgName = orgRes.data?.name ?? "หอพัก";

  // สรุปล่าสุด — แตะเพื่อไปหน้านั้น (pill ใช้ class คงที่ให้ Tailwind เก็บได้)
  const summary: { href: string; label: string; icon: LucideIcon; tone: IconTone; count: number; unit: string; pill: string }[] = [
    { href: "/liff/bills", label: "บิลค้างชำระ", icon: ReceiptText, tone: "indigo", count: unpaidCount, unit: "ใบ", pill: "bg-rose-100 text-rose-700" },
    { href: "/liff/parcels", label: "พัสดุรอรับ", icon: Package, tone: "emerald", count: waitingParcels, unit: "ชิ้น", pill: "bg-emerald-100 text-emerald-700" },
    { href: "/liff/maintenance", label: "งานแจ้งซ่อม", icon: Wrench, tone: "amber", count: activeReqs, unit: "รายการ", pill: "bg-amber-100 text-amber-700" },
  ];

  const quick: { href: string; label: string; sub: string; icon: LucideIcon; tone: IconTone }[] = [
    { href: "/liff/payment", label: "วิธีชำระเงิน", sub: "ช่องทางและขั้นตอนการโอน", icon: Wallet, tone: "violet" },
    { href: "/liff/contact", label: "ติดต่อผู้ดูแล", sub: "เบอร์โทรและช่องทางติดต่อ", icon: Phone, tone: "rose" },
  ];

  return (
    <div>
      {/* หัวการ์ด: ทักทาย + ยอดค้าง */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-4 text-white shadow-sm">
        <p className="text-xs text-indigo-100">{orgName}</p>
        <p className="mt-0.5 text-lg font-bold leading-tight">คุณ{tenant.full_name}</p>
        {outstanding > 0 ? (
          <Link href="/liff/bills" prefetch className="mt-3 block rounded-xl bg-white/10 px-4 py-3 transition active:bg-white/20">
            <p className="text-xs text-indigo-100">ยอดค้างชำระรวม</p>
            <div className="mt-0.5 flex items-end justify-between">
              <p className="text-2xl font-bold">{formatBaht(outstanding)}</p>
              <span className="pb-0.5 text-xs font-medium text-indigo-100">ดูบิล / ชำระเงิน ›</span>
            </div>
          </Link>
        ) : (
          <div className="mt-3 rounded-xl bg-white/10 px-4 py-3">
            <p className="text-xs text-indigo-100">ยอดค้างชำระ</p>
            <p className="mt-0.5 text-xl font-bold">ไม่มียอดค้าง</p>
          </div>
        )}
      </div>

      {/* สรุปล่าสุด */}
      <p className="mb-1.5 mt-5 px-1 text-sm font-medium text-slate-500">สรุปล่าสุด</p>
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        {summary.map((s, i) => (
          <Link
            key={s.href}
            href={s.href}
            prefetch
            className={`flex items-center gap-3 px-4 py-3 active:bg-slate-50 ${i > 0 ? "border-t border-slate-100" : ""}`}
          >
            <IconBadge icon={s.icon} tone={s.tone} size="sm" />
            <span className="flex-1 text-sm font-semibold text-slate-900">{s.label}</span>
            {s.count > 0 ? (
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${s.pill}`}>
                {s.count} {s.unit}
              </span>
            ) : (
              <span className="text-xs text-slate-300">ไม่มี</span>
            )}
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" strokeWidth={2} />
          </Link>
        ))}
      </div>

      {/* อื่น ๆ (ที่ไม่มีในแถบล่าง) */}
      <p className="mb-1.5 mt-5 px-1 text-sm font-medium text-slate-500">อื่น ๆ</p>
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        {quick.map((m, i) => (
          <Link
            key={m.href}
            href={m.href}
            prefetch
            className={`flex items-center gap-3 px-4 py-2.5 active:bg-slate-50 ${i > 0 ? "border-t border-slate-100" : ""}`}
          >
            <IconBadge icon={m.icon} tone={m.tone} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-slate-900">{m.label}</p>
              <p className="text-xs text-slate-400">{m.sub}</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" strokeWidth={2} />
          </Link>
        ))}
      </div>
    </div>
  );
}
