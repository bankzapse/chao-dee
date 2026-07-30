import { redirect } from "next/navigation";
import { getLiffTenant } from "@/lib/liff";
import { LiffHeader } from "../liff-header";

export default async function LiffMaintenance() {
  const tenant = await getLiffTenant();
  if (!tenant) redirect("/liff/link");

  return (
    <div>
      <LiffHeader title="แจ้งซ่อม" />
      <p className="rounded-2xl bg-white p-8 text-center text-sm text-slate-400 ring-1 ring-slate-100">
        🔧 กำลังพัฒนา — เร็วๆ นี้แจ้งซ่อมและแนบรูปได้ที่นี่
      </p>
    </div>
  );
}
