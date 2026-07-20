import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState, Badge } from "@/components/ui";
import { DeleteButton } from "@/components/action-form";
import {
  formatBaht,
  formatDate,
  CONTRACT_STATUS_LABEL,
  CONTRACT_STATUS_STYLE,
} from "@/lib/format";
import type { Contract, ContractStatus, Tenant } from "@/lib/types";
import {
  AddContractButton,
  EditContractButton,
  CloseContractButton,
  type RoomOption,
  type DealOption,
} from "./contract-buttons";
import { ContractDocsButton } from "./contract-docs";
import { deleteContract } from "./actions";

type ContractRow = Contract & {
  rooms: { room_number: string; buildings: { name: string } | null } | null;
  tenants: { full_name: string } | null;
};

export default async function ContractsPage() {
  const supabase = await createClient();

  const [{ data: contracts }, { data: rooms }, { data: tenants }] =
    await Promise.all([
      supabase
        .from("contracts")
        .select(
          "*, rooms(room_number, buildings(name)), tenants(full_name)"
        )
        .order("created_at", { ascending: false }),
      supabase.from("rooms").select("id, room_number, base_rent, buildings(name)"),
      supabase.from("tenants").select("*").order("full_name"),
    ]);

  const list = (contracts ?? []) as unknown as ContractRow[];

  // ดีลนายหน้าที่ยังเปิดอยู่ (ใช้ผูก attribution ตอนทำสัญญา) — resilient เผื่อยังไม่ได้รัน 0044
  const { data: dealRows } = await supabase
    .from("agency_deals")
    .select("lead_id, lead_name, lead_phone, status")
    .in("status", ["new", "contacted", "viewing"]);
  const dealOptions: DealOption[] = ((dealRows ?? []) as {
    lead_id: string | null;
    lead_name: string;
    lead_phone: string;
  }[])
    .filter((d) => d.lead_id)
    .map((d) => ({
      lead_id: d.lead_id as string,
      label: `${d.lead_name || "ผู้สนใจเช่า"}${d.lead_phone ? ` · ${d.lead_phone}` : ""}`,
    }));

  // นับจำนวนไฟล์เอกสารของแต่ละสัญญาจาก storage (folder: contracts/{id})
  const docCount = new Map<string, number>();
  await Promise.all(
    list.map(async (c) => {
      const { data: files } = await supabase.storage.from("documents").list(`contracts/${c.id}`, { limit: 100 });
      const n = (files ?? []).filter((f) => !f.name.startsWith(".")).length;
      if (n > 0) docCount.set(c.id, n);
    })
  );
  const roomOptions: RoomOption[] = (rooms ?? []).map((r) => {
    const b = r.buildings as unknown as { name: string } | null;
    return {
      id: r.id,
      label: `${b?.name ?? "-"} - ห้อง ${r.room_number}`,
      base_rent: Number(r.base_rent),
    };
  });

  // แบ่งตามอาคาร + เรียงห้องจากน้อยไปมาก
  const NO_ROOM = "— ไม่ระบุอาคาร —";
  const byBuilding = new Map<string, ContractRow[]>();
  for (const c of list) {
    const b = c.rooms?.buildings?.name ?? NO_ROOM;
    if (!byBuilding.has(b)) byBuilding.set(b, []);
    byBuilding.get(b)!.push(c);
  }
  for (const arr of byBuilding.values()) {
    arr.sort((a, b) =>
      (a.rooms?.room_number ?? "").localeCompare(b.rooms?.room_number ?? "", undefined, { numeric: true })
    );
  }
  const buildings = [...byBuilding.keys()].sort((a, b) => {
    if (a === NO_ROOM) return 1;
    if (b === NO_ROOM) return -1;
    return a.localeCompare(b, "th");
  });

  return (
    <div>
      <PageHeader
        title="สัญญาเช่า"
        subtitle="จัดการสัญญาเช่าได้ไม่จำกัด"
        action={
          <AddContractButton rooms={roomOptions} tenants={(tenants ?? []) as Tenant[]} deals={dealOptions} />
        }
      />

      {list.length === 0 ? (
        <EmptyState
          title="ยังไม่มีสัญญาเช่า"
          description={
            roomOptions.length === 0 || (tenants ?? []).length === 0
              ? "ต้องมีห้องและผู้เช่าอย่างน้อยอย่างละ 1 รายการก่อน"
              : "เริ่มสร้างสัญญาเช่าแรกของคุณ"
          }
          action={
            <AddContractButton rooms={roomOptions} tenants={(tenants ?? []) as Tenant[]} deals={dealOptions} />
          }
        />
      ) : (
        <div className="space-y-6">
          {buildings.map((building) => (
            <section key={building} className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700">🏢 {building}</h2>
                <span className="text-xs text-slate-400">{byBuilding.get(building)!.length} สัญญา</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-100 text-left text-slate-400">
                    <tr>
                      <th className="px-4 py-2 font-medium">ห้อง</th>
                      <th className="px-4 py-2 font-medium">ผู้เช่า</th>
                      <th className="px-4 py-2 font-medium">ช่วงสัญญา</th>
                      <th className="px-4 py-2 font-medium">ค่าเช่า</th>
                      <th className="px-4 py-2 font-medium">ประกัน</th>
                      <th className="px-4 py-2 font-medium">สถานะ</th>
                      <th className="px-4 py-2 text-right font-medium">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {byBuilding.get(building)!.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">
                          🚪 {c.rooms?.room_number ?? "-"}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{c.tenants?.full_name ?? "-"}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {formatDate(c.start_date)} → {c.end_date ? formatDate(c.end_date) : "ไม่กำหนด"}
                        </td>
                        <td className="px-4 py-3 text-slate-900">{formatBaht(c.rent_amount)}</td>
                        <td className="px-4 py-3 text-slate-600">{formatBaht(c.deposit_amount)}</td>
                        <td className="px-4 py-3">
                          <Badge className={CONTRACT_STATUS_STYLE[c.status as ContractStatus]}>
                            {CONTRACT_STATUS_LABEL[c.status as ContractStatus]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-3">
                            <ContractDocsButton contractId={c.id} count={docCount.get(c.id) ?? 0} />
                            <EditContractButton
                              contract={c}
                              roomLabel={`${c.rooms?.buildings?.name ?? "-"} · ${c.rooms?.room_number ?? "-"}`}
                              tenantName={c.tenants?.full_name ?? "-"}
                            />
                            {c.status === "active" && (
                              <CloseContractButton contractId={c.id} roomId={c.room_id} />
                            )}
                            <DeleteButton action={deleteContract.bind(null, c.id)} confirmText="ลบสัญญานี้?" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
