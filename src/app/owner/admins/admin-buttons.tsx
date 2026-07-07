"use client";

import { ModalButton } from "@/components/modal";
import { ActionForm } from "@/components/action-form";
import { ADMIN_SECTIONS } from "@/lib/admin-sections";
import { createAdmin, updateAdminPerms } from "./actions";

function PermsCheckboxes({ selected = [] }: { selected?: string[] }) {
  return (
    <div>
      <label className="label">สิทธิ์การเข้าถึง (หน้าที่ให้ดู/จัดการได้)</label>
      <div className="grid grid-cols-2 gap-2">
        {ADMIN_SECTIONS.map((s) => (
          <label key={s.key} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:border-indigo-300">
            <input type="checkbox" name="perms" value={s.key} defaultChecked={selected.includes(s.key)} className="accent-indigo-600" />
            {s.icon} {s.label}
          </label>
        ))}
      </div>
    </div>
  );
}

export function CreateAdminButton() {
  return (
    <ModalButton label="+ เพิ่มแอดมิน" title="สร้างบัญชีแอดมิน">
      {(close) => (
        <ActionForm action={createAdmin} onSuccess={close} submitLabel="สร้างแอดมิน">
          <div>
            <label className="label">ชื่อแอดมิน *</label>
            <input name="full_name" className="field" placeholder="เช่น สมหญิง ทีมงาน" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">เบอร์โทร (ใช้ล็อกอิน) *</label>
              <input name="phone" type="tel" inputMode="numeric" className="field" placeholder="0812345678" required />
            </div>
            <div>
              <label className="label">รหัสผ่าน *</label>
              <input name="password" type="text" className="field" placeholder="อย่างน้อย 8 ตัว" minLength={8} required />
            </div>
          </div>
          <PermsCheckboxes />
          <p className="text-xs text-slate-400">
            แอดมินจะเข้าที่ <b>/owner-login</b> ด้วยเบอร์ + รหัสผ่านนี้ และเห็นเฉพาะหน้าที่ให้สิทธิ์
          </p>
        </ActionForm>
      )}
    </ModalButton>
  );
}

export function EditPermsButton({
  userId,
  name,
  perms,
}: {
  userId: string;
  name: string;
  perms: string[];
}) {
  return (
    <ModalButton label="แก้สิทธิ์" title={`สิทธิ์ของ ${name}`} variant="secondary">
      {(close) => (
        <ActionForm action={updateAdminPerms.bind(null, userId)} onSuccess={close} submitLabel="บันทึกสิทธิ์">
          <PermsCheckboxes selected={perms} />
        </ActionForm>
      )}
    </ModalButton>
  );
}
