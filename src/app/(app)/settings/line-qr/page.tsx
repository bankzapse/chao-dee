import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { QRCodeImg, PrintButton, lineOaUrl } from "@/components/qr-code";

export const dynamic = "force-dynamic";

export default async function LineQrPrintPage() {
  const supabase = await createClient();

  // resolve org ของผู้ใช้อย่างชัดเจน (กัน .single() ได้หลายแถว/ไม่มีแถว แล้ว throw)
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user?.id ?? "")
    .maybeSingle();
  const orgId = (profile as { org_id?: string } | null)?.org_id ?? "";

  const { data: org } = await supabase
    .from("organizations")
    .select("name, line_oa_id")
    .eq("id", orgId)
    .maybeSingle();

  const id = (org as { line_oa_id?: string } | null)?.line_oa_id ?? "";
  const url = lineOaUrl(id);
  const name = (org as { name?: string } | null)?.name ?? "หอพัก";

  return (
    <div className="mx-auto max-w-md">
      <div className="no-print mb-4 flex items-center justify-between">
        <Link href="/settings" className="text-sm text-slate-500 hover:text-slate-700">
          ← กลับไปตั้งค่า
        </Link>
        {url && <PrintButton label="🖨️ พิมพ์ QR" />}
      </div>

      {!url ? (
        <div className="card p-8 text-center text-sm text-slate-500">
          ยังไม่ได้ตั้งค่า LINE OA — ไปที่{" "}
          <Link href="/settings" className="font-medium text-indigo-600">
            ตั้งค่า
          </Link>{" "}
          เพื่อใส่ LINE OA ID ก่อน
        </div>
      ) : (
        <div className="print-area card flex flex-col items-center gap-4 p-8 text-center">
          <div className="rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-white">
            💚 แอด LINE หอพัก
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{name}</h1>
          <p className="text-slate-500">สแกน QR เพื่อเพิ่มเพื่อน — รับแจ้งบิล / แจ้งซ่อม / พัสดุ</p>
          <QRCodeImg text={url} size={260} />
          <p className="text-lg font-bold text-emerald-600">{id}</p>
          <p className="text-xs text-slate-400">หรือค้นหา ID นี้ในแอป LINE → เพิ่มเพื่อน</p>
        </div>
      )}
    </div>
  );
}
