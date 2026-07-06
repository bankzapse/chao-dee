"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ModalButton } from "@/components/modal";
import { ActionForm } from "@/components/action-form";
import {
  recordPayment,
  updateSubscription,
  verifyPayment,
  rejectPayment,
  setOrgStatus,
  deleteMember,
} from "./actions";
import { PACKAGES } from "@/lib/packages";
import { SUBSCRIPTION_STATUS_LABEL, PAYMENT_METHOD_LABEL } from "@/lib/format";
import type { PaymentMethod } from "@/lib/types";

const today = () => new Date().toISOString().slice(0, 10);

/** บันทึกการชำระเงินให้สมาชิก */
export function RecordPaymentButton({
  orgId,
  defaultSlug,
}: {
  orgId: string;
  defaultSlug?: string;
}) {
  return (
    <ModalButton label="+ บันทึกการชำระ" title="บันทึกการชำระค่าสมาชิก">
      {(close) => (
        <ActionForm action={recordPayment.bind(null, orgId)} onSuccess={close}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">แพ็คเกจ</label>
              <select name="package_slug" className="field" defaultValue={defaultSlug ?? "pro"}>
                {PACKAGES.map((p) => (
                  <option key={p.slug} value={p.slug}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">รอบ</label>
              <select name="cycle" className="field" defaultValue="monthly">
                <option value="monthly">รายเดือน</option>
                <option value="yearly">รายปี</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">จำนวนเงิน (บาท) *</label>
              <input name="amount" type="number" step="0.01" className="field" required />
            </div>
            <div>
              <label className="label">วันที่ชำระ</label>
              <input name="paid_at" type="date" className="field" defaultValue={today()} />
            </div>
          </div>
          <div>
            <label className="label">ช่องทาง</label>
            <select name="method" className="field" defaultValue="transfer">
              {(Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]).map((m) => (
                <option key={m} value={m}>{PAYMENT_METHOD_LABEL[m]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">หมายเหตุ</label>
            <input name="note" className="field" />
          </div>
        </ActionForm>
      )}
    </ModalButton>
  );
}

/** แก้ไขสิทธิ์/แพ็คเกจด้วยมือ */
export function ManageSubButton({
  sub,
}: {
  sub: {
    orgId: string;
    package_slug: string;
    cycle: string;
    status: string;
    price: number;
    expires_at: string | null;
    note: string;
  };
}) {
  return (
    <ModalButton label="จัดการสิทธิ์" title="จัดการแพ็คเกจ/สิทธิ์" variant="secondary">
      {(close) => (
        <ActionForm action={updateSubscription.bind(null, sub.orgId)} onSuccess={close}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">แพ็คเกจ</label>
              <select name="package_slug" className="field" defaultValue={sub.package_slug}>
                {PACKAGES.map((p) => (
                  <option key={p.slug} value={p.slug}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">สถานะ</label>
              <select name="status" className="field" defaultValue={sub.status}>
                {Object.entries(SUBSCRIPTION_STATUS_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">รอบ</label>
              <select name="cycle" className="field" defaultValue={sub.cycle}>
                <option value="monthly">รายเดือน</option>
                <option value="yearly">รายปี</option>
              </select>
            </div>
            <div>
              <label className="label">ราคา/รอบ</label>
              <input name="price" type="number" step="0.01" className="field" defaultValue={sub.price} />
            </div>
          </div>
          <div>
            <label className="label">วันหมดอายุ</label>
            <input name="expires_at" type="date" className="field" defaultValue={sub.expires_at ? sub.expires_at.slice(0, 10) : ""} />
          </div>
          <div>
            <label className="label">หมายเหตุ</label>
            <input name="note" className="field" defaultValue={sub.note} />
          </div>
        </ActionForm>
      )}
    </ModalButton>
  );
}

function TxButton({
  onRun,
  label,
  className,
  confirm,
}: {
  onRun: () => Promise<void>;
  label: string;
  className: string;
  confirm?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      className={className}
      disabled={pending}
      onClick={() =>
        start(async () => {
          if (confirm && !window.confirm(confirm)) return;
          await onRun();
          router.refresh();
        })
      }
    >
      {pending ? "…" : label}
    </button>
  );
}

/** ลบสมาชิก (กิจการ) ทั้งหมด — อันตราย ต้องยืนยัน 2 ชั้น */
export function DeleteMemberButton({ orgId, orgName }: { orgId: string; orgName: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      className="text-sm font-medium text-rose-600 hover:text-rose-700 disabled:opacity-50"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(`ลบสมาชิก "${orgName}"?\nข้อมูลทั้งหมด (อาคาร/ห้อง/ผู้เช่า/สัญญา/บิล) และบัญชีเข้าระบบจะถูกลบถาวร`))
          return;
        if (!window.confirm("ยืนยันอีกครั้ง — การลบนี้กู้คืนไม่ได้")) return;
        start(async () => {
          await deleteMember(orgId);
          router.push("/owner/members");
          router.refresh();
        });
      }}
    >
      {pending ? "กำลังลบ…" : "🗑 ลบสมาชิก"}
    </button>
  );
}

export function VerifyPaymentButton({ paymentId }: { paymentId: string }) {
  return (
    <TxButton
      onRun={() => verifyPayment(paymentId)}
      label="✓ ยืนยัน & เปิดสิทธิ์"
      className="text-sm font-medium text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
      confirm="ยืนยันการชำระนี้และเปิดสิทธิ์/ต่ออายุให้สมาชิก?"
    />
  );
}

export function RejectPaymentButton({ paymentId }: { paymentId: string }) {
  return (
    <TxButton
      onRun={() => rejectPayment(paymentId)}
      label="ปฏิเสธ"
      className="text-sm font-medium text-rose-500 hover:text-rose-700 disabled:opacity-50"
    />
  );
}

export function SetStatusButton({
  orgId,
  to,
}: {
  orgId: string;
  to: "active" | "cancelled";
}) {
  return (
    <TxButton
      onRun={() => setOrgStatus(orgId, to)}
      label={to === "active" ? "เปิดสิทธิ์" : "ระงับสิทธิ์"}
      className={
        to === "active"
          ? "text-sm font-medium text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
          : "text-sm font-medium text-rose-500 hover:text-rose-700 disabled:opacity-50"
      }
      confirm={to === "cancelled" ? "ระงับสิทธิ์การใช้งานของสมาชิกนี้?" : undefined}
    />
  );
}
