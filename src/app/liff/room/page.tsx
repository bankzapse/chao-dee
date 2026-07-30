import { redirect } from "next/navigation";
import { getLiffTenant } from "@/lib/liff";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatBaht, formatDate } from "@/lib/format";
import { LiffHeader } from "../liff-header";

export default async function LiffRoom() {
  const tenant = await getLiffTenant();
  if (!tenant) redirect("/liff/link");

  const admin = createAdminClient();

  const roomP = tenant.room_id
    ? admin
        .from("rooms")
        .select("room_number, base_rent, water_rate, electricity_rate, buildings(name)")
        .eq("id", tenant.room_id)
        .maybeSingle()
    : Promise.resolve({ data: null });

  const contractP = admin
    .from("contracts")
    .select("start_date, end_date, rent_amount, deposit_amount, status")
    .eq("tenant_id", tenant.id)
    .eq("status", "active")
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const [{ data: room }, { data: contract }] = await Promise.all([roomP, contractP]);
  const b = room?.buildings as { name?: string } | { name?: string }[] | null;
  const buildingName = Array.isArray(b) ? b[0]?.name : b?.name;

  const rows: { label: string; value: string }[] = [];
  if (buildingName) rows.push({ label: "อาคาร", value: buildingName });
  if (room) {
    rows.push({ label: "ห้อง", value: room.room_number });
    rows.push({ label: "ค่าเช่า/เดือน", value: formatBaht(contract?.rent_amount ?? room.base_rent) });
    rows.push({ label: "ค่าน้ำ", value: `${formatBaht(room.water_rate)} / หน่วย` });
    rows.push({ label: "ค่าไฟ", value: `${formatBaht(room.electricity_rate)} / หน่วย` });
  }
  if (contract) {
    if (Number(contract.deposit_amount) > 0)
      rows.push({ label: "เงินประกัน", value: formatBaht(contract.deposit_amount) });
    rows.push({ label: "เริ่มสัญญา", value: formatDate(contract.start_date) });
    rows.push({
      label: "สิ้นสุดสัญญา",
      value: contract.end_date ? formatDate(contract.end_date) : "ไม่ระบุ",
    });
  }

  return (
    <div>
      <LiffHeader title="ข้อมูลห้อง / สัญญา" />
      {rows.length === 0 ? (
        <p className="rounded-2xl bg-white p-8 text-center text-sm text-slate-400 ring-1 ring-slate-100">
          ยังไม่มีข้อมูลห้อง — กรุณาติดต่อผู้ดูแลหอ
        </p>
      ) : (
        <div className="divide-y divide-slate-100 rounded-2xl bg-white px-4 shadow-sm ring-1 ring-slate-100">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between py-3.5 text-sm">
              <span className="text-slate-400">{r.label}</span>
              <span className="font-medium text-slate-900">{r.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
