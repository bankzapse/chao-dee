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
  const roomOptions: RoomOption[] = (rooms ?? []).map((r) => {
    const b = r.buildings as unknown as { name: string } | null;
    return {
      id: r.id,
      label: `${b?.name ?? "-"} - ห้อง ${r.room_number}`,
      base_rent: Number(r.base_rent),
    };
  });

  return (
    <div>
      <PageHeader
        title="สัญญาเช่า"
        subtitle="จัดการสัญญาเช่าได้ไม่จำกัด"
        action={
          <AddContractButton rooms={roomOptions} tenants={(tenants ?? []) as Tenant[]} />
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
            <AddContractButton rooms={roomOptions} tenants={(tenants ?? []) as Tenant[]} />
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">ห้อง</th>
                  <th className="px-4 py-3 font-medium">ผู้เช่า</th>
                  <th className="px-4 py-3 font-medium">ช่วงสัญญา</th>
                  <th className="px-4 py-3 font-medium">ค่าเช่า</th>
                  <th className="px-4 py-3 font-medium">ประกัน</th>
                  <th className="px-4 py-3 font-medium">สถานะ</th>
                  <th className="px-4 py-3 text-right font-medium">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {c.rooms?.buildings?.name ?? "-"} · {c.rooms?.room_number ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {c.tenants?.full_name ?? "-"}
                    </td>
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
                        <ContractDocsButton contractId={c.id} />
                        <EditContractButton
                          contract={c}
                          roomLabel={`${c.rooms?.buildings?.name ?? "-"} · ${c.rooms?.room_number ?? "-"}`}
                          tenantName={c.tenants?.full_name ?? "-"}
                        />
                        {c.status === "active" && (
                          <CloseContractButton contractId={c.id} roomId={c.room_id} />
                        )}
                        <DeleteButton
                          action={deleteContract.bind(null, c.id)}
                          confirmText="ลบสัญญานี้?"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
