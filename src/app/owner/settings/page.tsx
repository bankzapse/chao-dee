import { requirePlatformAdmin } from "@/lib/admin";
import { getPlatformPayment } from "@/lib/platform-settings";
import { PlatformPaymentForm } from "./platform-payment-form";

export default async function OwnerSettingsPage() {
  await requirePlatformAdmin();
  const pay = await getPlatformPayment();

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">ช่องทางรับเงิน</h1>
      <p className="mt-1 text-sm text-slate-500">
        PromptPay / บัญชีธนาคารของบริษัท ที่เจ้าของหอใช้สแกนจ่ายค่าสมาชิก (แสดงในหน้าต่ออายุ)
      </p>

      <div className="mt-6">
        <PlatformPaymentForm pay={pay} />
      </div>
    </div>
  );
}
