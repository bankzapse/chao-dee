"use client";

import { useActionState, useRef, useState } from "react";
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
    <button type="submit" className="btn-primary flex-1" disabled={pending}>
      {pending ? "กำลังดำเนินการ…" : label}
    </button>
  );
}

export function SignupForm({
  provinces,
  next,
  source,
}: {
  provinces: string[];
  next?: string;
  source?: string;
}) {
  const [reqState, reqAction] = useActionState<SignupState, FormData>(signUpRequest, null);
  const [verState, verAction] = useActionState<AuthState, FormData>(verifyOtp, null);
  const formRef = useRef<HTMLFormElement>(null);

  const [step, setStep] = useState(1);
  const [stepErr, setStepErr] = useState("");
  const [buildingType, setBuildingType] = useState("dorm");
  // เก็บรหัสผ่านไว้ฝั่ง client (ไม่ส่งกลับจาก server) เพื่อคงค่าเมื่อ error โดยไม่กระทบความปลอดภัย
  const [password, setPassword] = useState("");

  // ที่ตั้ง: จังหวัด → อำเภอ → ตำบล
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

  function goNext() {
    const f = formRef.current;
    const orgName = (f?.elements.namedItem("org_name") as HTMLInputElement)?.value.trim();
    const propStatus = (f?.elements.namedItem("prop_status") as HTMLSelectElement)?.value;
    if (!orgName) return setStepErr("กรุณากรอกชื่อหอพัก");
    if (!province || !amphoe || !tambon) return setStepErr("กรุณาเลือกจังหวัด อำเภอ และตำบลให้ครบ");
    if (!propStatus) return setStepErr("กรุณาเลือกสถานะหอพัก");
    setStepErr("");
    setStep(2);
  }

  const otpStep = Boolean(reqState?.otpSent);
  const phone = reqState?.phone ?? "";
  // ค่าที่กรอกไว้ (ส่งกลับจาก server เมื่อ error) เพื่อคงข้อมูลในฟอร์ม ไม่ต้องกรอกใหม่
  const v = reqState?.values;
  const errField = reqState?.field;
  const ring = (name: string) => (errField === name ? " border-rose-400 ring-1 ring-rose-300" : "");

  // ---- ยืนยัน OTP ----
  if (otpStep) {
    return (
      <div>
        <div className="mb-6 flex items-center gap-2 text-sm text-slate-400">
          <StepDot done /> <StepDot done /> <StepDot active />
          <span className="ml-1">ขั้นตอนสุดท้าย</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">ยืนยันเบอร์โทรศัพท์ 📱</h1>
        <p className="mt-1 text-sm text-slate-500">
          กรอกรหัส OTP ที่ส่งไปยัง <span className="font-medium text-slate-800">{phone}</span>
        </p>
        <form action={verAction} className="mt-6 max-w-sm space-y-4">
          <input type="hidden" name="phone" value={phone} />
          {next && <input type="hidden" name="next" value={next} />}
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
          <button type="submit" className="btn-primary w-full">
            ยืนยันและเริ่มใช้งาน 🎉
          </button>
        </form>
      </div>
    );
  }

  // ---- Wizard ----
  return (
    <form ref={formRef} action={reqAction}>
      {source && <input type="hidden" name="signup_source" value={source} />}
      {/* ตัวบอกขั้นตอน */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <StepDot active={step === 1} done={step > 1} />
          <div className={`h-0.5 flex-1 rounded ${step > 1 ? "bg-indigo-500" : "bg-slate-200"}`} />
          <StepDot active={step === 2} />
          <div className="h-0.5 flex-1 rounded bg-slate-200" />
          <StepDot />
        </div>
        <div className="mt-2 flex justify-between text-xs font-medium text-slate-400">
          <span className={step === 1 ? "text-indigo-600" : ""}>ข้อมูลหอพัก</span>
          <span className={step === 2 ? "text-indigo-600" : ""}>ข้อมูลผู้ดูแล</span>
          <span>ยืนยัน OTP</span>
        </div>
      </div>

      {/* ===== ขั้นที่ 1: ข้อมูลหอพัก ===== */}
      <div className={step === 1 ? "space-y-5" : "hidden"}>
        <div>
          <h2 className="text-xl font-bold text-slate-900">เล่าเรื่องหอพักของคุณ 🏠</h2>
          <p className="text-sm text-slate-500">ใช้ตั้งค่าเริ่มต้นให้อัตโนมัติ ปรับทีหลังได้</p>
        </div>

        <div>
          <label className="label">ชื่อหอพัก / กิจการ <span className="text-rose-500">*</span></label>
          <input name="org_name" className={"field" + ring("org_name")} placeholder="เช่น หอพักสุขใจ" defaultValue={v?.org_name} />
        </div>

        <div>
          <label className="label">ที่ตั้ง (จังหวัด / อำเภอ / ตำบล) <span className="text-rose-500">*</span></label>
          <div className="grid gap-3 sm:grid-cols-3">
            <select name="province" className="field" value={province} onChange={(e) => onProvince(e.target.value)}>
              <option value="" disabled>เลือกจังหวัด</option>
              {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select name="district" className="field" value={amphoe} onChange={(e) => onAmphoe(e.target.value)} disabled={!province}>
              <option value="" disabled>เลือกอำเภอ/เขต</option>
              {amphoes.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <select name="subdistrict" className="field" value={tambon} onChange={(e) => setTambon(e.target.value)} disabled={!amphoe}>
              <option value="" disabled>เลือกตำบล/แขวง</option>
              {tambons.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="label">ประเภทที่พัก <span className="text-rose-500">*</span></label>
          <input type="hidden" name="building_type" value={buildingType} />
          <div className="grid gap-3 sm:grid-cols-3">
            {BUILDING_TYPES.map((b) => (
              <button
                type="button"
                key={b.value}
                onClick={() => setBuildingType(b.value)}
                className={`rounded-xl border-2 p-4 text-left transition ${
                  buildingType === b.value
                    ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <span className="text-2xl">{b.emoji}</span>
                <span className="mt-1 block text-sm font-semibold text-slate-900">{b.label}</span>
                <span className="block text-xs text-slate-400">{b.sub}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label">จำนวนห้อง <span className="text-rose-500">*</span></label>
            <div className="grid grid-cols-2 gap-2">
              {ROOM_BUCKETS.map((r, i) => (
                <label key={r} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:border-indigo-300">
                  <input type="radio" name="room_count" value={r} defaultChecked={i === 0} className="accent-indigo-600" />
                  {r}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="label">สถานะหอพัก <span className="text-rose-500">*</span></label>
            <select name="prop_status" className="field" defaultValue="">
              <option value="" disabled>เลือกสถานะ</option>
              {PROPERTY_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {stepErr && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{stepErr}</p>}

        <button type="button" onClick={goNext} className="btn-primary w-full">
          ถัดไป — ข้อมูลผู้ดูแล →
        </button>
      </div>

      {/* ===== ขั้นที่ 2: ข้อมูลผู้ดูแล ===== */}
      <div className={step === 2 ? "space-y-5" : "hidden"}>
        <div>
          <h2 className="text-xl font-bold text-slate-900">ข้อมูลผู้ดูแล 👤</h2>
          <p className="text-sm text-slate-500">ใช้เข้าสู่ระบบและรับการแจ้งเตือน</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">ชื่อจริง <span className="text-rose-500">*</span></label>
            <input name="first_name" className={"field" + ring("first_name")} placeholder="สมชาย" defaultValue={v?.first_name} />
          </div>
          <div>
            <label className="label">นามสกุล <span className="text-rose-500">*</span></label>
            <input name="last_name" className="field" placeholder="ใจดี" defaultValue={v?.last_name} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">เบอร์โทรศัพท์ <span className="text-rose-500">*</span></label>
            <input name="phone" type="tel" inputMode="numeric" className={"field" + ring("phone")} placeholder="0812345678" defaultValue={v?.phone} />
          </div>
          <div>
            <label className="label">อีเมล <span className="text-rose-500">*</span></label>
            <input name="email" type="email" className={"field" + ring("email")} placeholder="you@email.com" defaultValue={v?.email} />
          </div>
        </div>

        <div>
          <label className="label">ตั้งรหัสผ่าน <span className="text-rose-500">*</span></label>
          <input
            name="password"
            type="password"
            className={"field" + ring("password")}
            placeholder="อย่างน้อย 8 ตัวอักษร"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="mt-1 text-xs text-slate-400">ใช้เบอร์โทร + รหัสผ่านนี้เข้าสู่ระบบได้</p>
        </div>

        <div>
          <label className="label">โค้ดแนะนำ / โปรโมชั่น (ถ้ามี)</label>
          <input name="promo" className="field" placeholder="ใส่โค้ดที่นี่" defaultValue={v?.promo} />
        </div>

        {reqState?.error && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{reqState.error}</p>
        )}

        <p className="text-xs leading-relaxed text-slate-400">
          การสมัครถือว่าคุณยอมรับ{" "}
          <Link href="/terms" className="text-indigo-600 hover:underline">ข้อกำหนดการใช้งาน</Link>{" "}
          และ{" "}
          <Link href="/privacy" className="text-indigo-600 hover:underline">นโยบายความเป็นส่วนตัว</Link>
        </p>

        <div className="flex gap-3">
          <button type="button" onClick={() => setStep(1)} className="btn-secondary">
            ← ย้อนกลับ
          </button>
          <SubmitButton label="สมัครและรับรหัส OTP" />
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-slate-500">
        มีบัญชีอยู่แล้ว?{" "}
        <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-700">เข้าสู่ระบบ</Link>
      </p>
    </form>
  );
}

function StepDot({ active, done }: { active?: boolean; done?: boolean }) {
  return (
    <span
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
        done
          ? "bg-indigo-600 text-white"
          : active
            ? "bg-indigo-100 text-indigo-700 ring-2 ring-indigo-300"
            : "bg-slate-100 text-slate-400"
      }`}
    >
      {done ? "✓" : ""}
    </span>
  );
}
