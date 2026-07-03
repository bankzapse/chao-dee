"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { signUpRequest, type SignupState } from "./actions";
import { verifyOtp, type AuthState } from "@/app/login/actions";
import { BUILDING_TYPES, ROOM_BUCKETS, PROPERTY_STATUS } from "@/lib/signup-options";

async function fetchGeo(params: Record<string, string>): Promise<string[]> {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`/api/geo?${qs}`);
  const data = (await res.json()) as { options: string[] };
  return data.options ?? [];
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "กำลังดำเนินการ…" : label}
    </button>
  );
}

export function SignupForm({ provinces }: { provinces: string[] }) {
  const [reqState, reqAction] = useActionState<SignupState, FormData>(signUpRequest, null);
  const [verState, verAction] = useActionState<AuthState, FormData>(verifyOtp, null);
  const [buildingType, setBuildingType] = useState("dorm");

  // ที่ตั้ง: จังหวัด → อำเภอ → ตำบล (โหลดต่อเนื่อง)
  const [province, setProvince] = useState("");
  const [amphoe, setAmphoe] = useState("");
  const [tambon, setTambon] = useState("");
  const [amphoes, setAmphoes] = useState<string[]>([]);
  const [tambons, setTambons] = useState<string[]>([]);

  async function onProvince(v: string) {
    setProvince(v);
    setAmphoe("");
    setTambon("");
    setTambons([]);
    setAmphoes(v ? await fetchGeo({ province: v }) : []);
  }
  async function onAmphoe(v: string) {
    setAmphoe(v);
    setTambon("");
    setTambons(v ? await fetchGeo({ province, amphoe: v }) : []);
  }

  const otpStep = Boolean(reqState?.otpSent);
  const phone = reqState?.phone ?? "";

  // ---- ขั้น 2: ยืนยัน OTP ----
  if (otpStep) {
    return (
      <div className="mx-auto max-w-sm">
        <h1 className="text-2xl font-bold text-slate-900">ยืนยันเบอร์โทรศัพท์</h1>
        <p className="mt-1 text-sm text-slate-500">
          กรอกรหัส OTP ที่ส่งไปยัง <span className="font-medium text-slate-800">{phone}</span>
        </p>
        <form action={verAction} className="mt-6 space-y-4">
          <input type="hidden" name="phone" value={phone} />
          <div>
            <label className="label">รหัส OTP</label>
            <input
              name="code"
              inputMode="numeric"
              className="field text-center text-lg tracking-[0.5em]"
              placeholder="______"
              maxLength={6}
              required
              autoFocus
            />
          </div>
          {verState?.error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{verState.error}</p>
          )}
          <SubmitButton label="ยืนยันและเริ่มใช้งาน" />
        </form>
      </div>
    );
  }

  // ---- ขั้น 1: กรอกข้อมูล ----
  return (
    <form action={reqAction} className="space-y-6">
      {/* ชื่อหอพัก */}
      <div>
        <label className="label">
          ชื่อหอพัก <span className="text-rose-500">*</span>
        </label>
        <input name="org_name" className="field" placeholder="เช่น หอพักสุขใจ" required />
      </div>

      {/* ที่ตั้ง: จังหวัด / อำเภอ / ตำบล */}
      <div>
        <label className="label">
          ที่ตั้งหอพัก <span className="text-rose-500">*</span>
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <select
            name="province"
            className="field"
            required
            value={province}
            onChange={(e) => onProvince(e.target.value)}
          >
            <option value="" disabled>
              เลือกจังหวัด
            </option>
            {provinces.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select
            name="district"
            className="field"
            required
            value={amphoe}
            onChange={(e) => onAmphoe(e.target.value)}
            disabled={!province}
          >
            <option value="" disabled>
              เลือกอำเภอ/เขต
            </option>
            {amphoes.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <select
            name="subdistrict"
            className="field"
            required
            value={tambon}
            onChange={(e) => setTambon(e.target.value)}
            disabled={!amphoe}
          >
            <option value="" disabled>
              เลือกตำบล/แขวง
            </option>
            {tambons.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* จำนวนห้อง */}
      <div>
        <label className="label">
          จำนวนห้องพัก <span className="text-rose-500">*</span>
        </label>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {ROOM_BUCKETS.map((r, i) => (
            <label key={r} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input type="radio" name="room_count" value={r} required defaultChecked={i === 0} />
              {r}
            </label>
          ))}
        </div>
      </div>

      {/* ประเภทอาคาร */}
      <div>
        <label className="label">
          ประเภทอาคาร <span className="text-rose-500">*</span>
        </label>
        <input type="hidden" name="building_type" value={buildingType} />
        <div className="grid gap-3 sm:grid-cols-3">
          {BUILDING_TYPES.map((b) => (
            <button
              type="button"
              key={b.value}
              onClick={() => setBuildingType(b.value)}
              className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${
                buildingType === b.value
                  ? "border-orange-400 bg-orange-50 ring-1 ring-orange-300"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <span className="text-2xl">{b.emoji}</span>
              <span>
                <span className="block text-sm font-semibold text-slate-900">{b.label}</span>
                <span className="block text-xs text-slate-400">{b.sub}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* สถานะหอพัก */}
      <div>
        <label className="label">
          สถานะหอพัก <span className="text-rose-500">*</span>
        </label>
        <select name="prop_status" className="field" required defaultValue="">
          <option value="" disabled>
            เลือก
          </option>
          {PROPERTY_STATUS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* ชื่อ-นามสกุล */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">
            ชื่อจริง <span className="text-rose-500">*</span>
          </label>
          <input name="first_name" className="field" placeholder="สมชาย" required />
        </div>
        <div>
          <label className="label">
            นามสกุล <span className="text-rose-500">*</span>
          </label>
          <input name="last_name" className="field" placeholder="ใจดี" required />
        </div>
      </div>

      {/* เบอร์ + อีเมล */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">
            เบอร์โทรศัพท์ <span className="text-rose-500">*</span>
          </label>
          <input name="phone" type="tel" inputMode="numeric" className="field" placeholder="0812345678" required />
        </div>
        <div>
          <label className="label">
            อีเมล <span className="text-rose-500">*</span>
          </label>
          <input name="email" type="email" className="field" placeholder="you@email.com" required />
        </div>
      </div>

      {/* รหัสผ่าน */}
      <div>
        <label className="label">
          รหัสผ่าน <span className="text-rose-500">*</span>
        </label>
        <input name="password" type="password" className="field" placeholder="กรอกรหัสผ่าน" minLength={8} required />
        <p className="mt-1 text-xs text-orange-500">* รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร</p>
        <p className="text-xs text-orange-500">* ใช้เบอร์โทร + รหัสผ่านนี้เข้าสู่ระบบได้</p>
      </div>

      {/* โปรโมชั่น */}
      <div>
        <label className="label text-orange-500">รหัสแนะนำ/รหัสโปรโมชั่น (ถ้ามี)</label>
        <input name="promo" className="field" placeholder="ใส่โค้ดหรือรหัสโปรโมชั่น ที่นี่" />
      </div>

      {reqState?.error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{reqState.error}</p>
      )}

      <p className="text-xs leading-relaxed text-slate-400">
        การสมัครถือว่าคุณยอมรับ{" "}
        <Link href="/terms" className="text-indigo-600 hover:underline">
          ข้อกำหนดการใช้งาน
        </Link>{" "}
        และ{" "}
        <Link href="/privacy" className="text-indigo-600 hover:underline">
          นโยบายความเป็นส่วนตัว
        </Link>
      </p>

      <SubmitButton label="สมัครและรับรหัส OTP" />

      <p className="text-center text-sm text-slate-500">
        มีบัญชีอยู่แล้ว?{" "}
        <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-700">
          เข้าสู่ระบบ
        </Link>
      </p>
    </form>
  );
}
