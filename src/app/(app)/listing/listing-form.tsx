"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ModalButton } from "@/components/modal";
import { ActionForm, type FormState } from "@/components/action-form";
import { Spinner } from "@/components/spinner";
import { GeoSelect } from "@/components/geo-select";
import { ListingExtraFields } from "./extra-fields";
import { ListingPhotosInput } from "./listing-photos-input";
import { AMENITIES, PROPERTY_TYPE_LABEL } from "@/lib/listings";
import type { Building, PropertyListing, PropertyType } from "@/lib/types";
import { saveListing, togglePublish } from "./actions";

type Vals = Record<string, unknown> | undefined;

function Fields({
  building,
  listing,
  v,
}: {
  building: Building;
  listing?: PropertyListing;
  v?: Vals;
}) {
  const selected = new Set<string>(
    (v?.amenities as string[]) ?? listing?.amenities ?? []
  );

  return (
    <>
      <ListingPhotosInput listingId={listing?.id} initialCover={listing?.cover_image} />

      <div>
        <label className="label">ชื่อที่พัก *</label>
        <input
          name="title"
          className="field"
          defaultValue={(v?.title as string) ?? listing?.title ?? building.name}
          placeholder="เช่น บ้านสวน เรสซิเดนซ์"
          required
        />
      </div>

      <div>
        <label className="label">ประเภท *</label>
        <select
          name="property_type"
          className="field"
          defaultValue={(v?.property_type as string) ?? listing?.property_type ?? "dorm"}
          required
        >
          {(Object.keys(PROPERTY_TYPE_LABEL) as PropertyType[]).map((t) => (
            <option key={t} value={t}>
              {PROPERTY_TYPE_LABEL[t]}
            </option>
          ))}
        </select>
      </div>

      <GeoSelect
        province={(v?.province as string) ?? listing?.province}
        district={(v?.district as string) ?? listing?.district}
        required
      />

      <div>
        <label className="label">ที่อยู่ / ทำเล (ย่อ)</label>
        <input
          name="address"
          className="field"
          defaultValue={(v?.address as string) ?? listing?.address ?? ""}
          placeholder="ใกล้ MRT ศูนย์วัฒนธรรม"
        />
      </div>

      <div>
        <label className="label">ราคาเช่า/เดือน (ช่วงราคา)</label>
        <div className="grid grid-cols-2 gap-3">
          <input
            name="price_min"
            type="number"
            step="1"
            min={0}
            className="field"
            defaultValue={Number(v?.price_min ?? listing?.price_min ?? 0) || ""}
            placeholder="ต่ำสุด"
          />
          <input
            name="price_max"
            type="number"
            step="1"
            min={0}
            className="field"
            defaultValue={Number(v?.price_max ?? listing?.price_max ?? 0) || ""}
            placeholder="สูงสุด"
          />
        </div>
        <p className="mt-1 text-xs text-slate-400">เว้นว่าง = ดึงราคาจากห้องในอาคารอัตโนมัติ</p>
      </div>

      <div>
        <label className="label">รายละเอียด / จุดเด่น <span className="text-slate-400">(ไม่บังคับ)</span></label>
        <textarea
          name="description"
          className="field"
          rows={3}
          defaultValue={(v?.description as string) ?? listing?.description ?? ""}
          placeholder="เช่น ห้องใหม่ พร้อมเฟอร์ ใกล้รถไฟฟ้า เดินทางสะดวก"
        />
      </div>

      <ListingExtraFields listing={listing} v={v} />

      {/* สิ่งอำนวยความสะดวก */}
      <div>
        <label className="label">สิ่งอำนวยความสะดวก</label>
        <div className="flex flex-wrap gap-2">
          {AMENITIES.map((a) => (
            <label
              key={a}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-sm text-slate-600 has-[:checked]:border-indigo-300 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-700"
            >
              <input
                type="checkbox"
                name="amenities"
                value={a}
                defaultChecked={selected.has(a)}
                className="accent-indigo-600"
              />
              {a}
            </label>
          ))}
        </div>
      </div>

      {/* ส่วนลดเดือนแรก */}
      <div>
        <label className="label">ส่วนลดเดือนแรก (เฉพาะติดต่อผ่าน Chao-Dee)</label>
        <div className="flex gap-2">
          <input
            name="first_month_discount_value"
            type="number"
            step="1"
            min={0}
            className="field"
            defaultValue={Number(
              v?.first_month_discount_value ?? listing?.first_month_discount_value ?? 0
            )}
            placeholder="0 = ไม่มีส่วนลด"
          />
          <select
            name="first_month_discount_type"
            className="field w-32"
            defaultValue={
              (v?.first_month_discount_type as string) ??
              listing?.first_month_discount_type ??
              "percent"
            }
          >
            <option value="percent">% เปอร์เซ็นต์</option>
            <option value="baht">บาท</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">เบอร์ติดต่อ *</label>
          <input
            name="contact_phone"
            className="field"
            defaultValue={(v?.contact_phone as string) ?? listing?.contact_phone ?? ""}
            placeholder="08x-xxx-xxxx"
            required
          />
        </div>
        <div>
          <label className="label">LINE ID</label>
          <input
            name="contact_line"
            className="field"
            defaultValue={(v?.contact_line as string) ?? listing?.contact_line ?? ""}
            placeholder="@yourline"
          />
        </div>
      </div>
      <p className="text-xs text-slate-400">
        ราคาเริ่มต้นและจำนวนห้องว่างจะดึงจากข้อมูลห้องของอาคารนี้ให้อัตโนมัติ
      </p>
    </>
  );
}

export function ListingButton({
  building,
  listing,
}: {
  building: Building;
  listing?: PropertyListing;
}) {
  return (
    <ModalButton
      label={listing ? "แก้ไขประกาศ" : "+ สร้างประกาศ"}
      title={`ประกาศ · ${building.name}`}
      variant={listing ? "secondary" : "primary"}
    >
      {(close) => (
        <ActionForm
          action={saveListing.bind(null, building.id, listing?.id ?? null)}
          onSuccess={close}
          submitLabel="บันทึกประกาศ"
        >
          {(state: FormState) => (
            <Fields building={building} listing={listing} v={state?.values} />
          )}
        </ActionForm>
      )}
    </ModalButton>
  );
}

export function PublishToggle({
  listingId,
  published,
}: {
  listingId: string;
  published: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() =>
        start(async () => {
          await togglePublish(listingId, !published);
          router.refresh();
        })
      }
      disabled={pending}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ${
        published
          ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {pending && <Spinner />}
      {published ? "🟢 เผยแพร่อยู่ — กดเพื่อซ่อน" : "⚪ ยังไม่เผยแพร่ — กดเพื่อเผยแพร่"}
    </button>
  );
}
