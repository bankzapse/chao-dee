import Link from "next/link";
import { redirect } from "next/navigation";
import { getLiffTenant, readLiffSession } from "@/lib/liff";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatBaht } from "@/lib/format";
import { LiffInit } from "./liff-init";

const MENU = [
  { href: "/liff/bills", icon: "🧾", label: "บิล / ยอดค้าง", sub: "ดูใบแจ้งหนี้และชำระเงิน" },
  { href: "/liff/maintenance", icon: "🔧", label: "แจ้งซ่อม", sub: "แจ้งปัญหา แนบรูปได้" },
  { href: "/liff/parcels", icon: "📦", label: "พัสดุ", sub: "พัสดุที่มาถึงหอ" },
  { href: "/liff/room", icon: "🏠", label: "ข้อมูลห้อง / สัญญา", sub: "ค่าเช่า ค่าน้ำ-ไฟ สัญญา" },
];

export default async function LiffHome() {
  const sess = await readLiffSession();
  // ยังไม่มีเซสชัน → ให้ LIFF init ตรวจ LINE ก่อน
  if (!sess) return <LiffInit liffId={process.env.NEXT_PUBLIC_LIFF_ID ?? ""} />;
  // ตรวจ LINE แล้วแต่ยังไม่ผูกบัญชี → ไปหน้าผูกเบอร์
  if (!sess.tenantId) redirect("/liff/link");

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
      <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-5 text-white">
        <p className="text-xs text-indigo-100">{org?.name ?? "หอพัก"}</p>
        <p className="mt-0.5 text-lg font-bold">สวัสดี คุณ{tenant.full_name}</p>
        <div className="mt-3 rounded-xl bg-white/10 px-4 py-3">
          <p className="text-xs text-indigo-100">ยอดค้างชำระรวม</p>
          <p className="text-2xl font-bold">{formatBaht(outstanding)}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {MENU.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="flex flex-col gap-1 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 active:scale-95"
          >
            <span className="text-3xl">{m.icon}</span>
            <span className="mt-1 font-semibold text-slate-900">{m.label}</span>
            <span className="text-xs text-slate-400">{m.sub}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
