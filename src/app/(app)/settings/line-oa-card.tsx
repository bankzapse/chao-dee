import { MessageCircle, Printer } from "lucide-react";
import { QRCodeImg } from "@/components/qr-code";
import { CHAO_DEE_OA_ID, chaoDeeOaUrl } from "@/lib/line-oa";

/** LINE OA กลางของ Chao-Dee — ทุกหอใช้ตัวเดียวกัน ผู้เช่าสแกนแอดเพื่อรับแจ้งบิล/แจ้งซ่อม/พัสดุ */
export function LineOaCard({ orgName }: { orgName: string }) {
  const url = chaoDeeOaUrl();
  const printHref = `/print/line-qr?name=${encodeURIComponent(orgName)}`;
  return (
    <div className="card mb-6 p-5">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-emerald-500" strokeWidth={2} />
        <h2 className="font-semibold text-slate-900">LINE OA ของ Chao-Dee (ให้ผู้เช่าสแกนเพิ่มเพื่อน)</h2>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        ให้ผู้เช่าสแกน QR นี้เพื่อแอด LINE OA ของ Chao-Dee — จะได้รับแจ้งบิล / แจ้งซ่อม / พัสดุ และเปิดพอร์ทัลผู้เช่าได้
        พิมพ์ไปติดที่หอได้เลย
      </p>

      <div className="mt-4 flex flex-col items-center gap-2 rounded-xl bg-slate-50 p-5 sm:w-fit">
        <QRCodeImg text={url} size={170} />
        <p className="text-sm font-semibold text-slate-700">{CHAO_DEE_OA_ID}</p>
        <a
          href={printHref}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          <Printer className="h-4 w-4" strokeWidth={2} />
          เปิดหน้าพิมพ์ QR
        </a>
      </div>
    </div>
  );
}
