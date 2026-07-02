"use client";

import { ModalButton } from "@/components/modal";
import { ActionForm } from "@/components/action-form";
import { createTenant, updateTenant } from "./actions";
import type { Tenant } from "@/lib/types";

function Fields({ t }: { t?: Tenant }) {
  return (
    <>
      <div>
        <label className="label">ชื่อ-นามสกุล *</label>
        <input name="full_name" className="field" defaultValue={t?.full_name} placeholder="สมชาย ใจดี" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">เบอร์โทร</label>
          <input name="phone" className="field" defaultValue={t?.phone} placeholder="0812345678" />
        </div>
        <div>
          <label className="label">อีเมล</label>
          <input name="email" type="email" className="field" defaultValue={t?.email} />
        </div>
      </div>
      <div>
        <label className="label">เลขบัตรประชาชน</label>
        <input name="id_card" className="field" defaultValue={t?.id_card} placeholder="1-2345-67890-12-3" />
      </div>
      <div>
        <label className="label">หมายเหตุ</label>
        <textarea name="note" className="field" rows={2} defaultValue={t?.note} />
      </div>
    </>
  );
}

export function AddTenantButton() {
  return (
    <ModalButton label="+ เพิ่มผู้เช่า" title="เพิ่มผู้เช่า">
      {(close) => (
        <ActionForm action={createTenant} onSuccess={close}>
          <Fields />
        </ActionForm>
      )}
    </ModalButton>
  );
}

export function EditTenantButton({ tenant }: { tenant: Tenant }) {
  return (
    <ModalButton label="แก้ไข" title="แก้ไขผู้เช่า" variant="secondary">
      {(close) => (
        <ActionForm action={updateTenant.bind(null, tenant.id)} onSuccess={close}>
          <Fields t={tenant} />
        </ActionForm>
      )}
    </ModalButton>
  );
}
