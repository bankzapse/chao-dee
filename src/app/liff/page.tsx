import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ReceiptText,
  Wrench,
  Package,
  DoorOpen,
  Wallet,
  Phone,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { getLiffTenant } from "@/lib/liff";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatBaht } from "@/lib/format";
import { IconBadge, type IconTone } from "@/components/icon-badge";

const MENU: { href: string; label: string; sub: string; icon: LucideIcon; tone: IconTone }[] = [
  { href: "/liff/bills", label: "บิล / ยอดค้าง", sub: "ใบแจ้งหนี้และการชำระเงิน", icon: ReceiptText, tone: "indigo" },
  { href: "/liff/maintenance", label: "แจ้งซ่อม", sub: "แจ้งปัญหาในห้อง แนบรูปได้", icon: Wrench, tone: "amber" },
  { href: "/liff/parcels", label: "พัสดุ", sub: "พัสดุที่มาถึงหอ", icon: Package, tone: "emerald" },
  { href: "/liff/room", label: "ข้อมูลห้อง / สัญญา", sub: "ค่าเช่า ค่าบริการ และสัญญาเช่า", icon: DoorOpen, tone: "cyan" },
  { href: "/liff/payment", label: "วิธีชำระเงิน", sub: "ช่องทางและขั้นตอนการโอน", icon: Wallet, tone: "violet" },
  { href: "/liff/contact", label: "ติดต่อผู้ดูแล", sub: "เบอร์โทรและช่องทางติดต่อ", icon: Phone, tone: "rose" },
];

export default async function LiffHome() {
  // เซสชัน + liff.init() จัดการที่ layout (LiffBoot) แล้ว — ที่นี่แค่เช็คว่าผูกบัญชีหรือยัง
  const tenant = await getLiffTenant();
  if (!tenant) redirect("/liff/link");

  // ยอดค้างรวมของผู้เช่า (ไม่นับบิลที่ยกเลิก) ไว้โชว์บนหัว
  const admin = createAdminClient();
  const { data: invs } = await admin
    .from("invoices")
    .select("total_amount, paid_amount, status")
    .eq("tenant_id", tenant.id)
    .neq("status", "void");
  const outstanding = (invs ?? []).reduce(
    (s, i) => s + (Number(i.total_amount) - Number(i.paid_amount)),
    0
  );

  const { data: org } = await admin
    .from("organizations")
    .select("name")
    .eq("id", tenant.org_id)
    .maybeSingle();

  return (
    <div>
      {/* หัวการ์ด: ทักทาย + ยอดค้าง */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-4 text-white shadow-sm">
        <p className="text-xs text-indigo-100">{org?.name ?? "หอพัก"}</p>
        <p className="mt-0.5 text-lg font-bold leading-tight">คุณ{tenant.full_name}</p>
        <div className="mt-3 rounded-xl bg-white/10 px-4 py-3">
          <p className="text-xs text-indigo-100">ยอดค้างชำระรวม</p>
          <p className="mt-0.5 text-2xl font-bold">{formatBaht(outstanding)}</p>
        </div>
      </div>

      {/* เมนู: รายการแนวตั้ง ไอคอน picture-shadow */}
      <div className="mt-3 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        {MENU.map((m, i) => (
          <Link
            key={m.href}
            href={m.href}
            className={`flex items-center gap-3 px-4 py-2.5 active:bg-slate-50 ${
              i > 0 ? "border-t border-slate-100" : ""
            }`}
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
