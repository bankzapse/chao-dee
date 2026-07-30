"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Handshake, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/spinner";
import { formatBaht } from "@/lib/format";
import { acceptAgencyTerms, disableAgency, submitCommissionPayment } from "./actions";

/** การ์ดยอมรับสัญญานายหน้า (click-wrap) */
export function AcceptAgencyCard() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState("");

  return (
    <div className="card p-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
        <Handshake className="h-5 w-5 text-indigo-600" strokeWidth={2} /> เปิดใช้บริการนายหน้าจัดหาผู้เช่า
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        ให้ทีม Chao-Dee ช่วยหาผู้เช่าให้ห้องว่างของคุณ — คิดค่านายหน้า{" "}
        <b>เท่ากับค่าเช่า 1 เดือน</b> เฉพาะเมื่อ<b>ปิดดีลสำเร็จ</b> (ผู้เช่าเซ็นสัญญาและชำระเงินก้อนแรกแล้ว)
        ไม่มีค่าใช้จ่ายล่วงหน้า
      </p>
      <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
        {[
          "ไม่ปิดดีล ไม่เสียค่านายหน้า",
          "ฐานคิดจากค่าเช่าห้องเท่านั้น (ไม่รวมน้ำ/ไฟ/ส่วนกลาง/มัดจำ)",
          "ผู้เช่าออกภายใน 15 วัน คืน 100% · ภายใน 30 วัน คืน 50%",
        ].map((t) => (
          <li key={t} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" strokeWidth={2.5} />
            <span>{t}</span>
          </li>
        ))}
      </ul>

      <label className="mt-5 flex items-start gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
        />
        <span>
          ข้าพเจ้าได้อ่านและยอมรับ{" "}
          <a href="/agency-terms" target="_blank" className="font-medium text-indigo-600 hover:text-indigo-700">
            สัญญาแต่งตั้งนายหน้าจัดหาผู้เช่า ↗
          </a>
        </span>
      </label>

      {err && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{err}</p>}

      <button
        className="btn-primary mt-5 inline-flex items-center gap-2"
        disabled={!checked || pending}
        onClick={() =>
          start(async () => {
            setErr("");
            const res = await acceptAgencyTerms();
            if (res.error) setErr(res.error);
            else router.refresh();
          })
        }
      >
        {pending && <Spinner />}
        {pending ? "กำลังเปิดใช้งาน…" : "ยอมรับและเปิดใช้บริการ"}
      </button>
    </div>
  );
}

/** ปุ่มปิดรับบริการ */
export function DisableAgencyButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      className="text-sm font-medium text-slate-500 hover:text-rose-600 disabled:opacity-50"
      disabled={pending}
      onClick={() =>
        start(async () => {
          if (!window.confirm("ปิดรับบริการนายหน้า? (ดีลที่เกิดขึ้นแล้วยังต้องชำระตามเดิม)")) return;
          await disableAgency();
          router.refresh();
        })
      }
    >
      {pending ? "กำลังปิด…" : "ปิดรับบริการ"}
    </button>
  );
}

/**
 * ปุ่มแนบสลิปชำระค่านายหน้า
 * นิติบุคคลเลือกได้: (A) จ่ายเต็ม หรือ (B) หัก ณ ที่จ่าย 3% → โอนสุทธิ + ออกหนังสือรับรอง
 */
export function PayCommissionButton({
  dealId,
  total,
  net,
  wht,
  isJuristic,
}: {
  dealId: string;
  total: number;
  net: number;
  wht: number;
  isJuristic: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok?: boolean; text: string } | null>(null);
  const canWithhold = isJuristic && wht > 0;
  const [withhold, setWithhold] = useState(false);
  const amount = withhold ? net : total;

  async function upload(file: File) {
    setBusy(true);
    setMsg(null);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "jpg";
      const path = `agency/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from("slips").upload(path, file);
      if (up.error) {
        setMsg({ text: "อัปโหลดสลิปไม่สำเร็จ: " + up.error.message });
        return;
      }
      const res = await submitCommissionPayment(dealId, path, withhold);
      if (res.error) setMsg({ text: res.error });
      else {
        setMsg({ ok: true, text: "ส่งสลิปแล้ว รอทีมงานยืนยัน" });
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      {canWithhold && (
        <div className="w-full max-w-[230px] space-y-1 rounded-lg bg-slate-50 p-2 text-left text-[11px] text-slate-600">
          <label className="flex items-start gap-1.5">
            <input
              type="radio"
              name={`paymode-${dealId}`}
              checked={!withhold}
              onChange={() => setWithhold(false)}
              className="mt-0.5"
            />
            <span>
              จ่ายเต็ม <b>{formatBaht(total)}</b>
            </span>
          </label>
          <label className="flex items-start gap-1.5">
            <input
              type="radio"
              name={`paymode-${dealId}`}
              checked={withhold}
              onChange={() => setWithhold(true)}
              className="mt-0.5"
            />
            <span>
              หัก ณ ที่จ่าย 3% ({formatBaht(wht)}) → โอนสุทธิ <b>{formatBaht(net)}</b>
              <span className="block text-slate-400">ยืนยันจะออกหนังสือรับรองให้ Chao-Dee</span>
            </span>
          </label>
        </div>
      )}
      <label className="btn-primary inline-flex cursor-pointer items-center gap-2 text-xs">
        {busy && <Spinner className="!h-3.5 !w-3.5" />}
        {busy ? "กำลังส่ง…" : `แนบสลิป ${formatBaht(amount)}`}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
            e.target.value = "";
          }}
        />
      </label>
      {msg && <p className={`text-xs ${msg.ok ? "text-emerald-600" : "text-rose-600"}`}>{msg.text}</p>}
    </div>
  );
}
