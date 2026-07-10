"use client";

import { useState } from "react";
import { ModalButton } from "@/components/modal";
import { ActionForm, type FormState } from "@/components/action-form";
import { createClient } from "@/lib/supabase/client";
import { GeoSelect } from "@/components/geo-select";
import { AMENITIES, PROPERTY_TYPE_LABEL } from "@/lib/listings";
import type { PropertyListing, PropertyType } from "@/lib/types";
import { saveStandaloneListing } from "./actions";

type Vals = Record<string, unknown> | undefined;

function Fields({ listing, v }: { listing?: PropertyListing; v?: Vals }) {
  const [cover, setCover] = useState<string>((v?.cover_image as string) ?? listing?.cover_image ?? "");
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const selected = new Set<string>((v?.amenities as string[]) ?? listing?.amenities ?? []);

  async function onFile(file: File) {
    setUploading(true);
    setErr("");
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "jpg";
      const path = `standalone/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from("listings").upload(path, file);
      if (up.error) {
        setErr("อัปโหลดรูปไม่สำเร็จ: " + up.error.message);
        return;
      }
      setCover(supabase.storage.from("listings").getPublicUrl(path).data.publicUrl);
    } finally {
      setUploading(false);
    }
  }

  const num = (k: keyof PropertyListing) => Number((v?.[k] as number) ?? listing?.[k] ?? 0);

  return (
    <>
      <input type="hidden" name="cover_image" value={cover} />
      <div>
        <label className="label">รูปหน้าปก</label>
        <div className="flex items-center gap-3">
          <div className="h-20 w-28 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover} alt="ปก" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">ไม่มีรูป</div>
            )}
          </div>
          <label className="btn-secondary cursor-pointer">
            {uploading ? "กำลังอัปโหลด…" : "เลือกรูป"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
                e.target.value = "";
              }}
            />
          </label>
        </div>
        {err && <p className="mt-1 text-sm text-rose-600">{err}</p>}
      </div>

      <div>
        <label className="label">ชื่อที่พัก *</label>
        <input name="title" className="field" defaultValue={(v?.title as string) ?? listing?.title ?? ""} placeholder="เช่น บ้านสวน เรสซิเดนซ์" required />
      </div>

      <div>
        <label className="label">ประเภท *</label>
        <select name="property_type" className="field" defaultValue={(v?.property_type as string) ?? listing?.property_type ?? "dorm"} required>
          {(Object.keys(PROPERTY_TYPE_LABEL) as PropertyType[]).map((t) => (
            <option key={t} value={t}>{PROPERTY_TYPE_LABEL[t]}</option>
          ))}
        </select>
      </div>

      <GeoSelect
        province={(v?.province as string) ?? listing?.province}
        district={(v?.district as string) ?? listing?.district}
        required
      />

      <div>
        <label className="label">ทำเล / จุดสังเกต (ย่อ)</label>
        <input name="address" className="field" defaultValue={(v?.address as string) ?? listing?.address ?? ""} placeholder="ใกล้ MRT ศูนย์วัฒนธรรม" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">ราคาต่ำสุด/เดือน (บาท) *</label>
          <input name="price_min" type="number" step="1" min={1} className="field" defaultValue={num("price_min") || ""} placeholder="3000" required />
        </div>
        <div>
          <label className="label">ราคาสูงสุด/เดือน (บาท)</label>
          <input name="price_max" type="number" step="1" min={0} className="field" defaultValue={num("price_max") || ""} placeholder="5000" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">จำนวนห้องทั้งหมด</label>
          <input name="total_rooms" type="number" step="1" min={0} className="field" defaultValue={num("total_rooms") || ""} />
        </div>
        <div>
          <label className="label">ห้องว่างตอนนี้ *</label>
          <input name="vacant_rooms" type="number" step="1" min={0} className="field" defaultValue={num("vacant_rooms") || ""} placeholder="แก้ไขจำนวนเองได้" required />
        </div>
      </div>

      <div>
        <label className="label">รายละเอียด / จุดเด่น <span className="text-slate-400">(ไม่บังคับ)</span></label>
        <textarea name="description" className="field" rows={3} defaultValue={(v?.description as string) ?? listing?.description ?? ""} placeholder="ห้องใหม่ พร้อมเฟอร์ ใกล้รถไฟฟ้า" />
      </div>

      <div>
        <label className="label">สิ่งอำนวยความสะดวก</label>
        <div className="flex flex-wrap gap-2">
          {AMENITIES.map((a) => (
            <label key={a} className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-sm text-slate-600 has-[:checked]:border-indigo-300 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-700">
              <input type="checkbox" name="amenities" value={a} defaultChecked={selected.has(a)} className="accent-indigo-600" />
              {a}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="label">ส่วนลดเดือนแรก (เฉพาะติดต่อผ่าน Chao-Dee)</label>
        <div className="flex gap-2">
          <input name="first_month_discount_value" type="number" step="1" min={0} className="field" defaultValue={num("first_month_discount_value")} placeholder="0 = ไม่มี" />
          <select name="first_month_discount_type" className="field w-32" defaultValue={(v?.first_month_discount_type as string) ?? listing?.first_month_discount_type ?? "percent"}>
            <option value="percent">% เปอร์เซ็นต์</option>
            <option value="baht">บาท</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">เบอร์ติดต่อ *</label>
          <input name="contact_phone" className="field" defaultValue={(v?.contact_phone as string) ?? listing?.contact_phone ?? ""} placeholder="08x-xxx-xxxx" required />
        </div>
        <div>
          <label className="label">LINE ID</label>
          <input name="contact_line" className="field" defaultValue={(v?.contact_line as string) ?? listing?.contact_line ?? ""} placeholder="@yourline" />
        </div>
      </div>
    </>
  );
}

export function StandaloneListingButton({
  listing,
  label,
  variant = "primary",
}: {
  listing?: PropertyListing;
  label: string;
  variant?: "primary" | "secondary";
}) {
  return (
    <ModalButton label={label} title={listing ? "แก้ไขประกาศ" : "ลงประกาศใหม่"} variant={variant}>
      {(close) => (
        <ActionForm
          action={saveStandaloneListing.bind(null, listing?.id ?? null)}
          onSuccess={close}
          submitLabel="บันทึกประกาศ"
        >
          {(state: FormState) => <Fields listing={listing} v={state?.values} />}
        </ActionForm>
      )}
    </ModalButton>
  );
}
