import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui";
import { DeleteButton } from "@/components/action-form";
import { formatNumber } from "@/lib/format";
import type { Building } from "@/lib/types";
import { AddBuildingButton, EditBuildingButton } from "./building-buttons";
import { deleteBuilding } from "./actions";

export default async function BuildingsPage() {
  const supabase = await createClient();

  const [{ data: buildings }, { data: rooms }] = await Promise.all([
    supabase.from("buildings").select("*").order("created_at", { ascending: true }),
    supabase.from("rooms").select("building_id"),
  ]);

  const roomCount = new Map<string, number>();
  (rooms ?? []).forEach((r: { building_id: string }) => {
    roomCount.set(r.building_id, (roomCount.get(r.building_id) ?? 0) + 1);
  });

  const list = (buildings ?? []) as Building[];

  return (
    <div>
      <PageHeader
        title="อาคาร"
        subtitle="จัดการอาคาร/สาขา ได้ไม่จำกัด"
        action={<AddBuildingButton />}
      />

      {list.length === 0 ? (
        <EmptyState
          title="ยังไม่มีอาคาร"
          description="เริ่มต้นด้วยการเพิ่มอาคารแรกของคุณ"
          action={<AddBuildingButton />}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((b) => (
            <div key={b.id} className="card flex flex-col p-5">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-semibold text-slate-900">
                    🏢 {b.name}
                  </h3>
                  {b.address && (
                    <p className="mt-0.5 truncate text-sm text-slate-500">{b.address}</p>
                  )}
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-600">
                <span className="font-semibold text-slate-900">{b.floors ?? 1}</span> ชั้น ·{" "}
                <span className="font-semibold text-slate-900">
                  {formatNumber(roomCount.get(b.id) ?? 0)}
                </span>{" "}
                ห้อง
              </p>
              {b.note && <p className="mt-1 text-xs text-slate-400">{b.note}</p>}

              <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-3">
                <EditBuildingButton building={b} />
                <DeleteButton
                  action={deleteBuilding.bind(null, b.id)}
                  confirmText={`ลบอาคาร "${b.name}"? ห้องและข้อมูลที่เกี่ยวข้องจะถูกลบด้วย`}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
