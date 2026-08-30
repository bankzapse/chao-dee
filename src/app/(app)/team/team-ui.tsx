"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { revokeInvitation, removeMember, setMemberRole } from "./actions";
import type { Member, Invitation } from "./page";
import type { Role } from "./team-roles";

const ROLE_LABEL: Record<string, string> = { owner: "เจ้าของ", admin: "แอดมิน", staff: "ทีมงาน" };
const ROLE_STYLE: Record<string, string> = {
  owner: "bg-indigo-100 text-indigo-700",
  admin: "bg-sky-100 text-sky-700",
  staff: "bg-slate-100 text-slate-600",
};

/** 66xxxxxxxxx → 0xxxxxxxxx เพื่อแสดงผล */
function displayPhone(p: string) {
  if (p.startsWith("66") && p.length === 11) return "0" + p.slice(2);
  return p;
}

/** ตัวเลือกเปลี่ยนประเภทสิทธิ์ของสมาชิก staff (เฉพาะเจ้าของ) */
function RoleSelect({ member, roles }: { member: Member; roles: Role[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState("");

  function onChange(value: string) {
    startTransition(async () => {
      setMsg("");
      const res = await setMemberRole(member.id, value || null);
      if (res?.error) setMsg(res.error);
      else {
        setMsg("บันทึกแล้ว");
        router.refresh();
        setTimeout(() => setMsg(""), 1500);
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      {msg && <span className="text-xs text-slate-400">{msg}</span>}
      <select
        defaultValue={member.role_id ?? ""}
        disabled={pending}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm disabled:opacity-50"
      >
        <option value="">— ไม่กำหนดสิทธิ์ —</option>
        {roles.map((r) => (
          <option key={r.id} value={r.id}>{r.name}</option>
        ))}
      </select>
    </div>
  );
}

export function TeamUI({
  myId,
  myRole,
  isOwner,
  members,
  invites,
  roles,
}: {
  myId: string;
  myRole: string;
  isOwner: boolean;
  members: Member[];
  invites: Invitation[];
  roles: Role[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  function canRemove(m: Member) {
    if (m.id === myId || m.role === "owner") return false;
    if (m.role === "admin" && myRole !== "owner") return false;
    return true;
  }

  function onRemove(m: Member) {
    if (!confirm(`ถอด "${m.full_name || displayPhone(m.phone)}" ออกจากทีม? บัญชีนี้จะเข้าถึงกิจการไม่ได้อีก`)) return;
    setBusyId(m.id);
    startTransition(async () => {
      const res = await removeMember(m.id);
      setBusyId(null);
      if (res?.error) alert(res.error);
      else router.refresh();
    });
  }

  function onRevoke(id: string) {
    setBusyId(id);
    startTransition(async () => {
      await revokeInvitation(id);
      setBusyId(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-3">
          <h2 className="font-semibold text-slate-900">สมาชิกในทีม ({members.length})</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">
                  {m.full_name || "(ไม่มีชื่อ)"}
                  {m.id === myId && <span className="ml-2 text-xs text-slate-400">(คุณ)</span>}
                </p>
                <p className="text-xs text-slate-500">{displayPhone(m.phone)}</p>
              </div>
              <div className="flex items-center gap-3">
                {/* staff + เจ้าของกำลังดู → เลือกประเภทสิทธิ์ได้ · อื่นๆ แสดง badge */}
                {isOwner && m.role === "staff" ? (
                  <RoleSelect member={m} roles={roles} />
                ) : (
                  <Badge className={ROLE_STYLE[m.role] ?? ROLE_STYLE.staff}>
                    {ROLE_LABEL[m.role] ?? m.role}
                  </Badge>
                )}
                {canRemove(m) && (
                  <button
                    onClick={() => onRemove(m)}
                    disabled={isPending && busyId === m.id}
                    className="text-sm text-rose-500 hover:text-rose-700 disabled:opacity-50"
                  >
                    ถอด
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* คำเชิญเก่าที่ค้าง (ระบบเชิญด้วยเบอร์เดิม) — เก็บไว้ให้ยกเลิกได้ */}
      {invites.length > 0 && (
        <div className="card overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-3">
            <h2 className="font-semibold text-slate-900">คำเชิญที่รอตอบรับ ({invites.length})</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {invites.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {inv.full_name || displayPhone(inv.phone)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {displayPhone(inv.phone)} · เชิญเมื่อ {formatDate(inv.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={ROLE_STYLE[inv.role] ?? ROLE_STYLE.staff}>
                    {ROLE_LABEL[inv.role] ?? inv.role}
                  </Badge>
                  <button
                    onClick={() => onRevoke(inv.id)}
                    disabled={isPending && busyId === inv.id}
                    className="text-sm text-slate-400 hover:text-slate-600 disabled:opacity-50"
                  >
                    ยกเลิก
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
