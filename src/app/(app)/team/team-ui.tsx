"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Badge } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { inviteMember, revokeInvitation, removeMember } from "./actions";
import type { FormState } from "@/components/action-form";
import type { Member, Invitation } from "./page";

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

function InviteButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "กำลังส่ง…" : "ส่งคำเชิญ"}
    </button>
  );
}

export function TeamUI({
  myId,
  myRole,
  members,
  invites,
}: {
  myId: string;
  myRole: string;
  members: Member[];
  invites: Invitation[];
}) {
  const router = useRouter();
  const [state, action] = useActionState<FormState, FormData>(inviteMember, null);
  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

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
    <div className="grid gap-6 lg:grid-cols-3">
      {/* ฟอร์มเชิญ */}
      <div className="lg:col-span-1">
        <div className="card p-5">
          <h2 className="font-semibold text-slate-900">เชิญทีมงาน</h2>
          <p className="mt-1 text-xs text-slate-500">
            ผู้ถูกเชิญเข้าร่วมกิจการเมื่อสมัครด้วยเบอร์ที่ระบุ
          </p>
          <form action={action} className="mt-4 space-y-3">
            <div>
              <label className="label">เบอร์โทรศัพท์</label>
              <input name="phone" type="tel" inputMode="numeric" className="field" placeholder="0812345678" required />
            </div>
            <div>
              <label className="label">ชื่อ (ไม่บังคับ)</label>
              <input name="full_name" className="field" placeholder="สมชาย ใจดี" />
            </div>
            <div>
              <label className="label">สิทธิ์</label>
              <select name="role" className="field" defaultValue="staff">
                <option value="staff">ทีมงาน — ใช้งานทั่วไป</option>
                {myRole === "owner" && <option value="admin">แอดมิน — จัดการทีมได้</option>}
              </select>
            </div>
            {state?.error && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{state.error}</p>
            )}
            {state?.ok && (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-600">ส่งคำเชิญแล้ว</p>
            )}
            <InviteButton />
          </form>
        </div>
      </div>

      {/* รายชื่อ + คำเชิญ */}
      <div className="space-y-6 lg:col-span-2">
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
                  <Badge className={ROLE_STYLE[m.role] ?? ROLE_STYLE.staff}>
                    {ROLE_LABEL[m.role] ?? m.role}
                  </Badge>
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
    </div>
  );
}
