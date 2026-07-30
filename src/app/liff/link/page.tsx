import { redirect } from "next/navigation";
import { getLiffTenant, readLiffSession } from "@/lib/liff";
import { LiffInit } from "../liff-init";
import { LinkForm } from "./link-form";

export default async function LiffLinkPage() {
  const sess = await readLiffSession();
  if (!sess) return <LiffInit liffId={process.env.NEXT_PUBLIC_LIFF_ID ?? ""} />;

  // ผูกแล้ว → เข้าเมนูเลย
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
      {/* DEBUG ชั่วคราว: LINE userId ที่ LIFF เห็น (ไว้เทียบกับ line_user_id ใน DB) */}
      <p className="mt-6 break-all text-center text-[10px] text-slate-300">
        debug sub: {sess.sub}
      </p>
    </div>
  );
}
