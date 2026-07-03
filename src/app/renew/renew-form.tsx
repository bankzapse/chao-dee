"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PromptPayQR } from "@/components/promptpay-qr";
import { PACKAGES } from "@/lib/packages";
import { formatBaht } from "@/lib/format";
import { submitRenewal, checkPromo } from "./actions";

export function RenewForm({
  platformPromptPay,
  defaultSlug,
}: {
  platformPromptPay: string;
  defaultSlug?: string;
}) {
  const router = useRouter();
  const buyable = PACKAGES.filter((p) => p.priceMonthly !== null);
  const [slug, setSlug] = useState(
    buyable.find((p) => p.slug === defaultSlug)?.slug ?? "pro"
  );
  const [cycle, setCycle] = useState<"monthly" | "yearly">("yearly");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok?: boolean; text: string } | null>(null);
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<{ code: string; discount: number; final: number } | null>(null);
  const [promoMsg, setPromoMsg] = useState<{ ok?: boolean; text: string } | null>(null);
  const [promoBusy, setPromoBusy] = useState(false);

  const pkg = PACKAGES.find((p) => p.slug === slug)!;
  const baseAmount =
    cycle === "yearly" ? pkg.priceYearlyTotal! : pkg.priceMonthly!;
  const amount = promo ? promo.final : baseAmount;

  // เปลี่ยนแพ็คเกจ/รอบ → ล้างส่วนลดเดิม (ต้องเช็คโค้ดใหม่)
  function resetPromo() {
    setPromo(null);
    setPromoMsg(null);
  }

  async function applyCode() {
    if (!promoInput.trim()) return;
    setPromoBusy(true);
    setPromoMsg(null);
    const res = await checkPromo(promoInput, slug, cycle);
    setPromoBusy(false);
    if (res.error) {
      setPromo(null);
      setPromoMsg({ text: res.error });
    } else {
      setPromo({ code: promoInput.trim().toUpperCase(), discount: res.discount!, final: res.final! });
      setPromoMsg({ ok: true, text: `ใช้โค้ดสำเร็จ ลด ${formatBaht(res.discount!)}` });
    }
  }

  async function submit() {
    setBusy(true);
    setMsg(null);
    try {
      let slipPath = "";
      if (file) {
        const supabase = createClient();
        const ext = file.name.split(".").pop() || "jpg";
        const path = `renewals/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("slips").upload(path, file);
        if (error) {
          setMsg({ text: "อัปโหลดสลิปไม่สำเร็จ: " + error.message });
          setBusy(false);
          return;
        }
        slipPath = path;
      }
      const res = await submitRenewal({
        package_slug: slug,
        cycle,
        slip_path: slipPath,
        promo_code: promo?.code,
      });
      if (res.error) setMsg({ text: res.error });
      else {
        setMsg({ ok: true, text: "ส่งคำขอต่ออายุแล้ว! ทีมงานจะยืนยันและเปิดสิทธิ์ให้เร็วที่สุด" });
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-5">
      {/* เลือกแพ็คเกจ */}
      <div className="space-y-4 md:col-span-3">
        <div>
          <label className="label">เลือกแพ็คเกจ</label>
          <div className="grid grid-cols-2 gap-3">
            {buyable.map((p) => (
              <button
                key={p.slug}
                type="button"
                onClick={() => {
                  setSlug(p.slug);
                  resetPromo();
                }}
                className={`rounded-xl border p-4 text-left transition ${
                  slug === p.slug
                    ? "border-indigo-400 bg-indigo-50 ring-1 ring-indigo-300"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <p className="font-bold text-slate-900">{p.name}</p>
                <p className="text-xs text-slate-500">{p.limits.rooms}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">รอบการชำระ</label>
          <div className="inline-flex rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setCycle("monthly");
                resetPromo();
              }}
              className={`rounded-md px-4 py-1.5 text-sm font-medium ${cycle === "monthly" ? "bg-white shadow-sm" : "text-slate-500"}`}
            >
              รายเดือน
            </button>
            <button
              type="button"
              onClick={() => {
                setCycle("yearly");
                resetPromo();
              }}
              className={`rounded-md px-4 py-1.5 text-sm font-medium ${cycle === "yearly" ? "bg-white shadow-sm" : "text-slate-500"}`}
            >
              รายปี (คุ้มที่สุด)
            </button>
          </div>
        </div>

        <div>
          <label className="label">โค้ดส่วนลด (ถ้ามี)</label>
          <div className="flex gap-2">
            <input
              className="field flex-1 uppercase"
              placeholder="เช่น NEWYEAR"
              value={promoInput}
              onChange={(e) => {
                setPromoInput(e.target.value);
                if (promo) resetPromo();
              }}
            />
            <button
              type="button"
              onClick={applyCode}
              disabled={promoBusy || !promoInput.trim()}
              className="btn-secondary whitespace-nowrap"
            >
              {promoBusy ? "…" : "ใช้โค้ด"}
            </button>
          </div>
          {promoMsg && (
            <p className={`mt-1 text-xs ${promoMsg.ok ? "text-emerald-600" : "text-rose-600"}`}>
              {promoMsg.text}
            </p>
          )}
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">ยอดชำระ</p>
          {promo ? (
            <>
              <p className="text-sm text-slate-400 line-through">{formatBaht(baseAmount)}</p>
              <p className="text-3xl font-bold text-indigo-600">{formatBaht(amount)}</p>
              <p className="text-xs text-emerald-600">
                ส่วนลด {formatBaht(promo.discount)} · โค้ด {promo.code}
              </p>
            </>
          ) : (
            <p className="text-3xl font-bold text-indigo-600">{formatBaht(amount)}</p>
          )}
          <p className="text-xs text-slate-400">
            {pkg.name} · {cycle === "yearly" ? "รายปี" : "รายเดือน"}
          </p>
        </div>

        <div>
          <label className="label">แนบสลิปการโอน (แนะนำ)</label>
          <input
            type="file"
            accept="image/*"
            className="field"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>

        {msg && (
          <p className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"}`}>
            {msg.text}
          </p>
        )}

        <button className="btn-primary w-full" onClick={submit} disabled={busy || Boolean(msg?.ok)}>
          {busy ? "กำลังส่ง…" : "ยืนยันการชำระ & ส่งคำขอต่ออายุ"}
        </button>
      </div>

      {/* PromptPay QR */}
      <div className="md:col-span-2">
        <div className="card flex flex-col items-center gap-2 p-6">
          <p className="text-sm font-medium text-slate-600">สแกนจ่ายผ่าน PromptPay</p>
          {platformPromptPay ? (
            <>
              <PromptPayQR promptpayId={platformPromptPay} amount={amount} size={180} />
              <p className="text-lg font-bold text-slate-900">{formatBaht(amount)}</p>
              <p className="text-center text-xs text-slate-400">
                โอนแล้วแนบสลิป กด “ยืนยัน” ระบบจะเปิดสิทธิ์หลังทีมงานตรวจสอบ
              </p>
            </>
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">
              ยังไม่ได้ตั้งค่า PromptPay ของระบบ — กรุณาติดต่อทีมงานเพื่อชำระเงิน
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
