import { redirect } from "next/navigation";
import { getLiffTenant } from "@/lib/liff";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatBaht, formatDate } from "@/lib/format";
import { LiffHeader } from "../liff-header";

type Row = { label: string; value: string };
type Section = { title: string; rows: Row[] };

/** ดึงข้อมูลห้องแบบเผื่อ column ใหม่ยังไม่มีใน DB (schema drift) — error แล้วถอยไป column หลัก */
async function loadRoom(admin: ReturnType<typeof createAdminClient>, roomId: string | null) {
  if (!roomId) return null;
  const full = await admin
    .from("rooms")
    .select("room_number, base_rent, water_rate, electricity_rate, parking_fee, garbage_fee, buildings(name)")
    .eq("id", roomId)
    .maybeSingle();
  if (!full.error) return full.data as Record<string, unknown> | null;
  const core = await admin
    .from("rooms")
    .select("room_number, base_rent, water_rate, electricity_rate, buildings(name)")
    .eq("id", roomId)
    .maybeSingle();
  return core.data as Record<string, unknown> | null;
}

async function loadContract(admin: ReturnType<typeof createAdminClient>, tenantId: string) {
  const q = (cols: string) =>
    admin
      .from("contracts")
      .select(cols)
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle();
  const full = await q("start_date, end_date, rent_amount, deposit_amount, occupant_count, late_fee, late_fee_mode, terms");
  if (!full.error) return full.data as Record<string, unknown> | null;
  const core = await q("start_date, end_date, rent_amount, deposit_amount");
  return core.data as Record<string, unknown> | null;
}

const num = (v: unknown) => Number(v ?? 0);
const str = (v: unknown) => (v == null ? "" : String(v));

export default async function LiffRoom() {
  const tenant = await getLiffTenant();
  if (!tenant) redirect("/liff/link");

  const admin = createAdminClient();
  const [room, contract] = await Promise.all([
    loadRoom(admin, tenant.room_id),
    loadContract(admin, tenant.id),
  ]);

  const b = room?.buildings as { name?: string } | { name?: string }[] | null | undefined;
  const buildingName = Array.isArray(b) ? b[0]?.name : b?.name;

  const sections: Section[] = [];

  // ── ห้องพัก ──
  const roomRows: Row[] = [];
  if (buildingName) roomRows.push({ label: "อาคาร", value: str(buildingName) });
  if (room?.room_number) roomRows.push({ label: "ห้อง", value: str(room.room_number) });
  if (roomRows.length) sections.push({ title: "ห้องพัก", rows: roomRows });

  // ── ค่าเช่า & ค่าบริการ ──
  if (room) {
    const feeRows: Row[] = [];
    feeRows.push({
      label: "ค่าเช่า / เดือน",
      value: formatBaht(num(contract?.rent_amount) || num(room.base_rent)),
    });
    feeRows.push({ label: "ค่าน้ำ", value: `${formatBaht(num(room.water_rate))} / หน่วย` });
    feeRows.push({ label: "ค่าไฟฟ้า", value: `${formatBaht(num(room.electricity_rate))} / หน่วย` });
    if (num(room.parking_fee) > 0)
      feeRows.push({ label: "ค่าที่จอดรถ", value: `${formatBaht(num(room.parking_fee))} / เดือน` });
    if (num(room.garbage_fee) > 0)
      feeRows.push({ label: "ค่าขยะ", value: `${formatBaht(num(room.garbage_fee))} / เดือน` });
    sections.push({ title: "ค่าเช่า & ค่าบริการ", rows: feeRows });
  }

  // ── สัญญาเช่า ──
  if (contract) {
    const cRows: Row[] = [];
    cRows.push({ label: "เริ่มสัญญา", value: formatDate(str(contract.start_date)) });
    cRows.push({
      label: "สิ้นสุดสัญญา",
      value: contract.end_date ? formatDate(str(contract.end_date)) : "ไม่ระบุ (ต่อเนื่อง)",
    });
    if (num(contract.deposit_amount) > 0)
      cRows.push({ label: "เงินประกัน", value: formatBaht(num(contract.deposit_amount)) });
    if (num(contract.occupant_count) > 0)
      cRows.push({ label: "จำนวนผู้พัก", value: `${num(contract.occupant_count)} คน` });
    if (num(contract.late_fee) > 0)
      cRows.push({
        label: "ค่าปรับชำระล่าช้า",
        value: `${formatBaht(num(contract.late_fee))}${str(contract.late_fee_mode) === "per_day" ? " / วัน" : " / ครั้ง"}`,
      });
    sections.push({ title: "สัญญาเช่า", rows: cRows });
  }

  const terms = str(contract?.terms).trim();

  return (
    <div>
      <LiffHeader title="ข้อมูลห้อง / สัญญา" />
      {sections.length === 0 ? (
        <p className="rounded-2xl bg-white p-8 text-center text-sm text-slate-400 ring-1 ring-slate-100">
          ยังไม่มีข้อมูลห้อง — กรุณาติดต่อผู้ดูแลหอ
        </p>
      ) : (
        <div className="space-y-4">
          {sections.map((sec) => (
            <div key={sec.title}>
              <p className="mb-1.5 px-1 text-sm font-medium text-slate-500">{sec.title}</p>
              <div className="divide-y divide-slate-100 rounded-2xl bg-white px-4 shadow-sm ring-1 ring-slate-100">
                {sec.rows.map((r) => (
                  <div key={r.label} className="flex items-center justify-between gap-3 py-3.5">
                    <span className="text-sm text-slate-500">{r.label}</span>
                    <span className="text-right text-sm font-semibold text-slate-900">{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {terms && (
            <div>
              <p className="mb-1.5 px-1 text-sm font-medium text-slate-500">เงื่อนไข / ข้อตกลงเพิ่มเติม</p>
              <p className="whitespace-pre-wrap rounded-2xl bg-white p-4 text-sm leading-relaxed text-slate-700 shadow-sm ring-1 ring-slate-100">
                {terms}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
