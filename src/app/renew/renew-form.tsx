"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PromptPayQR } from "@/components/promptpay-qr";
import { PACKAGES, COMMON_FEATURES, yearlyDiscount } from "@/lib/packages";
import { COMPANY, splitVat } from "@/lib/company";
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
  const [slug, setSlug] = useState(buyable.find((p) => p.slug === defaultSlug)?.slug ?? "pro");
  const [cycle, setCycle] = useState<"monthly" | "yearly">("yearly");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok?: boolean; text: string } | null>(null);
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<{ code: string; discount: number; final: number } | null>(null);
  const [promoMsg, setPromoMsg] = useState<{ ok?: boolean; text: string } | null>(null);
  const [promoBusy, setPromoBusy] = useState(false);

  const pkg = PACKAGES.find((p) => p.slug === slug)!;
  const baseAmount = cycle === "yearly" ? pkg.priceYearlyTotal! : pkg.priceMonthly!;
  const amount = promo ? promo.final : baseAmount;
  const vat = COMPANY.vatRegistered ? splitVat(amount) : null;
  const yearSave = yearlyDiscount(pkg);

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
    if (!file) {
      setMsg({ text: "กรุณาแนบสลิปการโอนก่อนส่งคำขอ" });
      return;
    }
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
      const res = await submitRenewal({ package_slug: slug, cycle, slip_path: slipPath, promo_code: promo?.code });
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
    <div className="grid items-start gap-6 lg:grid-cols-3">
      {/* ===== ซ้าย ===== */}
      <div className="space-y-6 lg:col-span-2">
        {/* เลือกแพ็คเกจ */}
        <div className="card p-5">
          <h2 className="mb-3 font-semibold text-slate-900">🏢 เลือกแพ็คเกจ</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {buyable.map((p) => (
              <button
                key={p.slug}
                type="button"
                onClick={() => {
                  setSlug(p.slug);
                  resetPromo();
                }}
                className={`rounded-xl border-2 p-4 text-left transition ${
                  slug === p.slug
                    ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-bold text-slate-900">{p.name}</p>
                  {p.highlight && (
                    <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-medium text-white">แนะนำ</span>
                  )}
                </div>
                <p className="text-xs text-slate-500">{p.tagline}</p>
                <p className="mt-2 text-sm font-semibold text-indigo-600">
                  ฿{(cycle === "yearly" ? p.priceYearlyPerMonth : p.priceMonthly)?.toLocaleString()}
                  <span className="text-xs font-normal text-slate-400">
                    /เดือน{cycle === "yearly" ? " (รายปี)" : ""}
                  </span>
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* แพ็คเกจที่เลือก: เพดาน + ฟีเจอร์ */}
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">แพ็คเกจที่เลือก · {pkg.name}</h2>
              <p className="text-xs text-slate-500">{pkg.tagline}</p>
            </div>
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">เลือกแล้ว</span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { v: pkg.caps.buildings, l: "อาคาร" },
              { v: pkg.caps.rooms, l: "ห้อง" },
              { v: pkg.caps.tenants, l: "ผู้เช่า" },
            ].map((s) => (
              <div key={s.l} className="rounded-xl bg-slate-50 py-3 text-center">
                <p className="text-2xl font-bold text-slate-900">{s.v ?? "∞"}</p>
                <p className="text-xs text-slate-400">{s.l}</p>
              </div>
            ))}
          </div>

          <p className="mt-4 text-sm font-medium text-slate-700">ฟีเจอร์ที่รวมอยู่</p>
          <div className="mt-2 grid gap-x-4 gap-y-2 sm:grid-cols-2">
            {COMMON_FEATURES.map((f) => (
              <div key={f} className="flex items-start gap-2 text-sm text-slate-600">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] text-emerald-700">
                  ✓
                </span>
                {f}
              </div>
            ))}
          </div>
        </div>

        {/* เลือกรอบการชำระเงิน */}
        <div className="card p-5">
          <h2 className="mb-3 font-semibold text-slate-900">เลือกรอบการชำระเงิน</h2>
          <div className="space-y-3">
            <CycleOption
              selected={cycle === "monthly"}
              onSelect={() => {
                setCycle("monthly");
                resetPromo();
              }}
              title="รายเดือน"
              sub="ชำระทุกเดือน"
              price={`฿${pkg.priceMonthly?.toLocaleString()}`}
              unit="ต่อเดือน"
            />
            <CycleOption
              selected={cycle === "yearly"}
              onSelect={() => {
                setCycle("yearly");
                resetPromo();
              }}
              title="รายปี"
              badge={`ประหยัด ฿${yearSave.toLocaleString()}`}
              sub="ชำระครั้งเดียวทั้งปี (คุ้มที่สุด!)"
              price={`฿${pkg.priceYearlyPerMonth?.toLocaleString()}`}
              unit={`ต่อเดือน (฿${pkg.priceYearlyTotal?.toLocaleString()}/ปี)`}
            />
          </div>
        </div>

        {/* โค้ดส่วนลด */}
        <div className="card p-5">
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
            <p className={`mt-1 text-xs ${promoMsg.ok ? "text-emerald-600" : "text-rose-600"}`}>{promoMsg.text}</p>
          )}
        </div>
      </div>

      {/* ===== ขวา: สรุปการสั่งซื้อ ===== */}
      <div className="lg:col-span-1">
        <div className="card sticky top-6 p-5">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-900">🧾 สรุปการสั่งซื้อ</h2>

          <div className="space-y-2.5 text-sm">
            <Row label="แพ็คเกจ" value={pkg.name} bold />
            <Row label="รอบการชำระ" value={cycle === "yearly" ? "รายปี" : "รายเดือน"} bold />
            {cycle === "yearly" && yearSave > 0 && (
              <Row label="ประหยัดจากรายปี" value={`-฿${yearSave.toLocaleString()}`} green />
            )}
            <div className="my-2 border-t border-slate-100" />
            <Row label={vat ? "ราคาสินค้า (ก่อน VAT)" : "ราคาสินค้า"} value={formatBaht(vat ? vat.base : baseAmount)} />
            {promo && <Row label={`ส่วนลดโค้ด ${promo.code}`} value={`-${formatBaht(promo.discount)}`} green />}
            {vat && <Row label="VAT 7%" value={formatBaht(vat.vat)} />}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
            <span className="font-semibold text-slate-900">ยอดรวม</span>
            <span className="text-2xl font-bold text-indigo-600">{formatBaht(amount)}</span>
          </div>
          {!vat && (
            <p className="mt-1 text-right text-xs text-slate-400">ราคานี้ไม่มีภาษีมูลค่าเพิ่ม (VAT)</p>
          )}

          {/* PromptPay */}
          <div className="mt-5 flex flex-col items-center gap-2 rounded-xl bg-slate-50 p-4">
            {platformPromptPay ? (
              <>
                <p className="text-xs font-medium text-slate-500">สแกนจ่ายผ่าน PromptPay</p>
                <PromptPayQR promptpayId={platformPromptPay} amount={amount} size={160} />
                <p className="text-base font-bold text-slate-900">{formatBaht(amount)}</p>
              </>
            ) : (
              <p className="py-6 text-center text-xs text-slate-400">
                ยังไม่ได้ตั้งค่า PromptPay ของระบบ — กรุณาติดต่อทีมงาน
              </p>
            )}
          </div>

          {/* แนบสลิป (บังคับ) */}
          <div className="mt-4">
            <label className="label">แนบสลิปการโอน <span className="text-rose-500">*</span></label>
            <input
              type="file"
              accept="image/*"
              className="field"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {!file && <p className="mt-1 text-xs text-slate-400">ต้องแนบสลิปก่อนจึงจะส่งคำขอได้</p>}
            {file && <p className="mt-1 text-xs text-emerald-600">✓ แนบแล้ว: {file.name}</p>}
          </div>

          {msg && (
            <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"}`}>
              {msg.text}
            </p>
          )}

          <button
            className="btn-primary mt-4 w-full"
            onClick={submit}
            disabled={busy || Boolean(msg?.ok) || !file}
          >
            {busy ? "กำลังส่ง…" : "ยืนยัน & ส่งคำขอต่ออายุ"}
          </button>
          <p className="mt-2 text-center text-[11px] text-slate-400">
            ทีมงานจะตรวจสอบและเปิดสิทธิ์ให้หลังยืนยันการชำระ
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold, green }: { label: string; value: string; bold?: boolean; green?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className={`${bold ? "font-semibold text-slate-900" : green ? "font-medium text-emerald-600" : "text-slate-700"}`}>
        {value}
      </span>
    </div>
  );
}

function CycleOption({
  selected,
  onSelect,
  title,
  sub,
  price,
  unit,
  badge,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  sub: string;
  price: string;
  unit: string;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center justify-between rounded-xl border-2 p-4 text-left transition ${
        selected ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-slate-300"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
            selected ? "border-indigo-600" : "border-slate-300"
          }`}
        >
          {selected && <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />}
        </span>
        <span>
          <span className="flex items-center gap-2 font-semibold text-slate-900">
            {title}
            {badge && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-medium text-rose-600">{badge}</span>}
          </span>
          <span className="block text-xs text-slate-400">{sub}</span>
        </span>
      </div>
      <div className="text-right">
        <p className="font-bold text-slate-900">{price}</p>
        <p className="text-[11px] text-slate-400">{unit}</p>
      </div>
    </button>
  );
}
