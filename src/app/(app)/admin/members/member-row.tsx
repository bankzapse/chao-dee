"use client";

import { ModalButton } from "@/components/modal";
import { ActionForm } from "@/components/action-form";
import { updateSubscription } from "./actions";
import { PACKAGES } from "@/lib/packages";
import { SUBSCRIPTION_STATUS_LABEL } from "@/lib/format";

export type SubEdit = {
  orgId: string;
  orgName: string;
  package_slug: string;
  cycle: string;
  status: string;
  price: number;
  expires_at: string | null;
  note: string;
};

export function EditSubButton({ sub }: { sub: SubEdit }) {
  const expiresDate = sub.expires_at ? sub.expires_at.slice(0, 10) : "";
  return (
    <ModalButton label="จัดการ" title={`สมาชิก: ${sub.orgName}`} variant="secondary">
      {(close) => (
        <ActionForm action={updateSubscription.bind(null, sub.orgId)} onSuccess={close}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">แพ็คเกจ</label>
              <select name="package_slug" className="field" defaultValue={sub.package_slug}>
                {PACKAGES.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">รอบบิล</label>
              <select name="cycle" className="field" defaultValue={sub.cycle}>
                <option value="monthly">รายเดือน</option>
                <option value="yearly">รายปี</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">สถานะ</label>
              <select name="status" className="field" defaultValue={sub.status}>
                {Object.entries(SUBSCRIPTION_STATUS_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">ราคา/รอบ (บาท)</label>
              <input name="price" type="number" step="0.01" className="field" defaultValue={sub.price} />
            </div>
          </div>
          <div>
            <label className="label">วันหมดอายุ</label>
            <input name="expires_at" type="date" className="field" defaultValue={expiresDate} />
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
