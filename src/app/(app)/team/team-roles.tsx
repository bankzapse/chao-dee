"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { Trash2, Plus, ShieldCheck } from "lucide-react";
import { PERMISSION_MODULES, ACTION_LABEL, type PermAction } from "@/lib/permissions";
import { createRole, deleteRole, createTeamMember } from "./actions";
import type { FormState } from "@/components/action-form";

export type Role = { id: string; name: string; permissions: string[] };

function SubmitBtn({ label, icon }: { label: string; icon?: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary inline-flex items-center gap-1.5 disabled:opacity-60">
      {icon}
      {pending ? "กำลังบันทึก…" : label}
    </button>
  );
}

/** ตารางติ๊กสิทธิ์ (โมดูล × การกระทำ) */
function PermissionMatrix({ defaultChecked = [] }: { defaultChecked?: string[] }) {
  const set = new Set(defaultChecked);
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500">
            <th className="px-3 py-2 font-medium">โมดูล</th>
            {(["view", "create", "edit", "delete"] as PermAction[]).map((a) => (
              <th key={a} className="px-3 py-2 text-center font-medium">{ACTION_LABEL[a]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PERMISSION_MODULES.map((m) => (
            <tr key={m.key} className="border-b border-slate-100 last:border-0">
              <td className="px-3 py-2 text-slate-700">{m.label}</td>
              {(["view", "create", "edit", "delete"] as PermAction[]).map((a) => {
                const key = `${m.key}:${a}`;
                const supported = m.actions.includes(a);
                return (
                  <td key={a} className="px-3 py-2 text-center">
                    {supported ? (
                      <input type="checkbox" name="perms" value={key} defaultChecked={set.has(key)} className="h-4 w-4 accent-indigo-600" />
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** จัดการ role: สร้างใหม่ + รายการ + ลบ */
function RolesManager({ roles }: { roles: Role[] }) {
  const [state, action] = useActionState<FormState, FormData>(createRole, null);
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function onDelete(id: string, name: string) {
    if (!confirm(`ลบประเภท "${name}"? สมาชิกที่ใช้ประเภทนี้จะไม่มีสิทธิ์จนกว่าจะกำหนดใหม่`)) return;
    startTransition(async () => { await deleteRole(id); });
  }

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-800">
          <ShieldCheck className="h-5 w-5 text-indigo-600" /> ประเภททีมงาน & สิทธิ์
        </h2>
        <button onClick={() => setOpen((v) => !v)} className="btn-secondary inline-flex items-center gap-1 text-sm">
          <Plus className="h-4 w-4" /> สร้างประเภท
        </button>
      </div>

      {roles.length === 0 ? (
        <p className="text-sm text-slate-400">ยังไม่มีประเภททีมงาน — สร้างประเภทแรกเพื่อกำหนดสิทธิ์ให้ทีมงาน</p>
      ) : (
        <ul className="mb-4 space-y-2">
          {roles.map((r) => (
            <li key={r.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
              <div>
                <p className="font-medium text-slate-800">{r.name}</p>
                <p className="text-xs text-slate-400">{r.permissions.length} สิทธิ์</p>
              </div>
              <button onClick={() => onDelete(r.id, r.name)} disabled={pending} className="text-rose-500 hover:text-rose-600 disabled:opacity-50">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <form action={action} className="space-y-3 rounded-xl bg-slate-50 p-4">
          <div>
            <label className="label">ชื่อประเภท</label>
            <input name="name" className="field" placeholder="เช่น แม่บ้าน, พนักงานเก็บเงิน" required />
          </div>
          <div>
            <label className="label">สิทธิ์ที่ให้</label>
            <PermissionMatrix />
          </div>
          {state?.error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{state.error}</p>}
          {state?.ok && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-600">สร้างประเภทแล้ว</p>}
          <SubmitBtn label="บันทึกประเภท" icon={<ShieldCheck className="h-4 w-4" />} />
        </form>
      )}
    </div>
  );
}

/** สร้างบัญชีทีมงาน (username + รหัสผ่าน + role) */
function MemberCreator({ roles }: { roles: Role[] }) {
  const [state, action] = useActionState<FormState, FormData>(createTeamMember, null);
  return (
    <div className="card p-5">
      <h2 className="mb-1 text-base font-semibold text-slate-800">สร้างบัญชีทีมงาน</h2>
      <p className="mb-4 text-sm text-slate-500">ทีมงานเข้าระบบด้วย username + รหัสผ่านที่คุณตั้งให้ (ไม่ต้องใช้เบอร์)</p>
      <form action={action} className="space-y-3">
        <div>
          <label className="label">ชื่อ-นามสกุล</label>
          <input name="full_name" className="field" placeholder="เช่น สมชาย ใจดี" required />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">ชื่อผู้ใช้ (Username)</label>
            <input name="username" className="field" placeholder="a-z, 0-9, _ . (3-20)" autoCapitalize="none" required />
          </div>
          <div>
            <label className="label">รหัสผ่าน</label>
            <input name="password" type="text" className="field" placeholder="อย่างน้อย 6 ตัว เช่น sss123" required />
          </div>
        </div>
        <div>
          <label className="label">ประเภททีมงาน (สิทธิ์)</label>
          <select name="role_id" className="field" defaultValue="">
            <option value="">— ไม่กำหนด (ยังไม่มีสิทธิ์) —</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
        {state?.error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{state.error}</p>}
        {state?.ok && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-600">สร้างบัญชีทีมงานแล้ว</p>}
        <SubmitBtn label="สร้างบัญชี" icon={<Plus className="h-4 w-4" />} />
      </form>
    </div>
  );
}

/** ส่วนจัดการทีมงานแบบ custom role — เฉพาะเจ้าของ */
export function TeamRoles({ roles }: { roles: Role[] }) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
      <RolesManager roles={roles} />
      <MemberCreator roles={roles} />
    </div>
  );
}
