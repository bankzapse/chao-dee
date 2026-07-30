import Link from "next/link";
import { redirect } from "next/navigation";
import { getLiffTenant } from "@/lib/liff";
import { createAdminClient } from "@/lib/supabase/admin";
import { PaymentBox, type PaymentMethod } from "@/components/payment-box";
import { type BankInfo } from "@/components/bank-info";
import { LiffHeader } from "../liff-header";

/** ดึงข้อมูลช่องทางรับเงินของหอ เผื่อ column ยังไม่มีใน DB (schema drift) */
async function loadPayInfo(admin: ReturnType<typeof createAdminClient>, orgId: string) {
  const full = await admin
    .from("organizations")
    .select("payment_method, promptpay_id, bank_name, bank_account_no, bank_account_name, bank_qr_url")
    .eq("id", orgId)
    .maybeSingle();
  if (!full.error) return (full.data ?? {}) as Record<string, unknown>;
  return {} as Record<string, unknown>;
}

const str = (v: unknown) => (v == null ? "" : String(v));

const STEPS = [
  { n: 1, text: "เปิดเมนู “บิล / ยอดค้าง” เพื่อดูยอดที่ต้องชำระ" },
  { n: 2, text: "สแกน QR หรือโอนเข้าบัญชีตามช่องทางด้านล่าง" },
  { n: 3, text: "โอนแล้วส่งรูปสลิปกลับมาในแชท LINE เพื่อยืนยัน" },
];

export default async function LiffPayment() {
  const tenant = await getLiffTenant();
  if (!tenant) redirect("/liff/link");

  const admin = createAdminClient();
  const info = await loadPayInfo(admin, tenant.org_id);

  const method = (str(info.payment_method) || "promptpay") as PaymentMethod;
  const bank: BankInfo = {
    bank_name: str(info.bank_name),
    bank_account_no: str(info.bank_account_no),
    bank_account_name: str(info.bank_account_name),
  };
  const promptpayId = str(info.promptpay_id);
  const bankQrUrl = str(info.bank_qr_url);
  const hasChannel = Boolean(promptpayId || bank.bank_account_no);

  return (
    <div>
      <LiffHeader title="วิธีชำระเงิน" />

      {/* ขั้นตอน */}
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <p className="mb-3 font-semibold text-slate-900">ขั้นตอนการชำระเงิน</p>
        <ol className="space-y-3">
          {STEPS.map((s) => (
            <li key={s.n} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                {s.n}
              </span>
              <span className="text-sm leading-relaxed text-slate-600">{s.text}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* ช่องทางรับเงิน */}
      <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <p className="mb-3 font-semibold text-slate-900">ช่องทางชำระเงิน</p>
        {hasChannel ? (
          <div className="flex flex-col items-center rounded-xl bg-slate-50 p-5">
            <PaymentBox method={method} promptpayId={promptpayId} bank={bank} bankQrUrl={bankQrUrl} />
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-slate-400">
            ยังไม่ได้ตั้งค่าช่องทางรับเงิน — กรุณาติดต่อผู้ดูแลหอ
          </p>
        )}
      </div>

      <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-center text-sm text-amber-700">
        โอนแล้วอย่าลืม <span className="font-semibold">ส่งสลิปในแชท LINE</span> — ยอดจะอัปเดตหลังผู้ดูแลตรวจสอบ
      </div>

      <div className="mt-4 text-center">
        <Link href="/liff/bills" className="text-sm font-medium text-indigo-600 active:opacity-70">
          ไปดูบิล / ยอดค้าง →
        </Link>
      </div>
    </div>
  );
}
