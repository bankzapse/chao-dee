import { redirect } from "next/navigation";
import { getLiffTenant } from "@/lib/liff";
import { LinkForm } from "./link-form";

export default async function LiffLinkPage() {
  // เซสชัน + liff.init() จัดการที่ layout (LiffBoot) — ที่นี่แค่เช็คว่าผูกแล้วหรือยัง
  const tenant = await getLiffTenant();
  if (tenant) redirect("/liff");

  return (
    <div className="pt-6">
      <div className="text-center">
        <div className="text-4xl">🔗</div>
        <h1 className="mt-2 text-xl font-bold text-slate-900">ผูกบัญชีผู้เช่า</h1>
        <p className="mt-1 text-sm text-slate-500">
          กรอกเบอร์โทรที่คุณให้ไว้กับหอพัก เพื่อดูบิลและแจ้งซ่อมผ่าน LINE
        </p>
      </div>
      <div className="mt-6">
        <LinkForm />
      </div>
      <p className="mt-4 text-center text-xs text-slate-400">
        ถ้าเบอร์ไม่ตรงหรือผูกไม่ได้ กรุณาติดต่อผู้ดูแลหอให้เพิ่ม/แก้เบอร์ให้ก่อน
      </p>
    </div>
  );
}
