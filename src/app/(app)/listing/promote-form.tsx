"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ModalButton } from "@/components/modal";
import { createClient } from "@/lib/supabase/client";
import { PromptPayQR } from "@/components/promptpay-qr";
import { Spinner } from "@/components/spinner";
import { formatBaht } from "@/lib/format";
import { PROMO_PLANS } from "@/lib/promotions";
import { submitPromotion } from "./actions";

export function PromoteButton({
  listingId,
  platformPromptPay,
  active,
}: {
  listingId: string;
  platformPromptPay: string;
  active?: boolean;
}) {
  return (
    <ModalButton
      label={active ? "⭐ ต่ออายุโปรโมท" : "⭐ โปรโมท"}
      title="ซื้อโปรโมทประกาศ"
      variant="secondary"
    >
      {(close) => (
        <PromoPanel listingId={listingId} platformPromptPay={platformPromptPay} onDone={close} />
      )}
    </ModalButton>
  );
}

function PromoPanel({
  listingId,
  platformPromptPay,
  onDone,
}: {
  listingId: string;
  platformPromptPay: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const [days, setDays] = useState<number>(30);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok?: boolean; text: string } | null>(null);
  const plan = PROMO_PLANS.find((p) => p.days === days) ?? PROMO_PLANS[0];

  async function submit() {
    if (!file) {
      setMsg({ text: "กรุณาแนบสลิปการโอนก่อนส่งคำขอ" });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "jpg";
      const path = `promotions/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from("slips").upload(path, file);
      if (up.error) {
        setMsg({ text: "อัปโหลดสลิปไม่สำเร็จ: " + up.error.message });
        setBusy(false);
        return;
      }
      const res = await submitPromotion({ listing_id: listingId, days, slip_path: path });
      if (res.error) setMsg({ text: res.error });
      else {
        setMsg({ ok: true, text: "ส่งคำขอโปรโมทแล้ว! ทีมงานจะตรวจสอบและเปิดโปรโมทให้เร็วที่สุด" });
        router.refresh();
        setTimeout(onDone, 1200);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-indigo-50 p-3 text-sm text-indigo-800">
        ⭐ โปรโมทแล้วประกาศจะถูก<span className="font-semibold">ดันขึ้นบนสุด</span>ของหน้าค้นหา
        พร้อมป้าย “โปรโมท” — เห็นชัด คนสนใจมากขึ้น
      </div>

      {/* เลือกแพ็คเกจ */}
      <div>
        <label className="label">เลือกระยะเวลา</label>
        <div className="grid grid-cols-3 gap-2">
          {PROMO_PLANS.map((p) => (
            <button
              key={p.days}
              type="button"
              onClick={() => setDays(p.days)}
              className={`rounded-xl border-2 p-3 text-center transition ${
                days === p.days
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <p className="font-bold text-slate-900">{p.label}</p>
              <p className="text-sm font-semibold text-indigo-600">{formatBaht(p.price)}</p>
              {"popular" in p && p.popular && (
                <span className="mt-1 inline-block rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-medium text-white">
                  คุ้มสุด
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* PromptPay */}
      <div className="flex flex-col items-center gap-2 rounded-xl bg-slate-50 p-4">
        {platformPromptPay ? (
          <>
            <p className="text-xs font-medium text-slate-500">สแกนจ่ายผ่าน PromptPay</p>
            <PromptPayQR promptpayId={platformPromptPay} amount={plan.price} size={160} />
            <p className="text-base font-bold text-slate-900">{formatBaht(plan.price)}</p>
          </>
        ) : (
          <p className="py-6 text-center text-xs text-slate-400">
            ยังไม่ได้ตั้งค่า PromptPay ของระบบ — กรุณาติดต่อทีมงาน
          </p>
        )}
      </div>

      {/* แนบสลิป */}
      <div>
        <label className="label">
          แนบสลิปการโอน <span className="text-rose-500">*</span>
        </label>
        <input
          type="file"
          accept="image/*"
          className="field"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        {file && <p className="mt-1 text-xs text-emerald-600">✓ แนบแล้ว: {file.name}</p>}
      </div>

      {msg && (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"
          }`}
        >
          {msg.text}
        </p>
      )}

      <button
        className="btn-primary inline-flex w-full items-center justify-center gap-2"
        onClick={submit}
        disabled={busy || Boolean(msg?.ok) || !file}
      >
        {busy && <Spinner />}
        {busy ? "กำลังส่ง…" : `ยืนยันซื้อโปรโมท ${plan.label} · ${formatBaht(plan.price)}`}
      </button>
    </div>
  );
}
