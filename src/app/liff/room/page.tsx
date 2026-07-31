import { redirect } from "next/navigation";
import { FileText, Download } from "lucide-react";
import { getLiffTenant } from "@/lib/liff";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatBaht, formatDate } from "@/lib/format";
import { LiffHeader } from "../liff-header";

type Row = { label: string; value: string };
type Section = { title: string; rows: Row[] };
type Admin = ReturnType<typeof createAdminClient>;

/** ดึงข้อมูลห้องแบบเผื่อ column ใหม่ยังไม่มีใน DB (schema drift) — error แล้วถอยไป column หลัก */
async function loadRoom(admin: Admin, roomId: string | null) {
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

async function loadContract(admin: Admin, tenantId: string) {
  const q = (cols: string) =>
    admin
      .from("contracts")
      .select(cols)
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle();
  const full = await q("id, room_id, start_date, end_date, rent_amount, deposit_amount, occupant_count, late_fee, late_fee_mode, terms");
  if (!full.error) return full.data as Record<string, unknown> | null;
  const core = await q("id, room_id, start_date, end_date, rent_amount, deposit_amount");
  return core.data as Record<string, unknown> | null;
}

/** เอกสารสัญญาจาก storage (documents/contracts/{id}) พร้อม signed URL ให้ผู้เช่าเปิดดู/ดาวน์โหลด */
async function loadDocs(admin: Admin, contractId: string) {
  const out: { name: string; url: string }[] = [];
  try {
    const { data } = await admin.storage.from("documents").list(`contracts/${contractId}`, { limit: 100 });
    const files = (data ?? []).filter((f) => !f.name.startsWith("."));
    for (const f of files) {
      const { data: signed } = await admin.storage
        .from("documents")
        .createSignedUrl(`contracts/${contractId}/${f.name}`, 60 * 60);
      if (signed?.signedUrl) {
        // ชื่อไฟล์เก็บเป็น "{doc_type}__{ชื่อจริง}" — โชว์ชื่อจริงให้อ่านง่าย
        const nice = f.name.includes("__") ? f.name.split("__").slice(1).join("__") : f.name;
        out.push({ name: nice || f.name, url: signed.signedUrl });
      }
    }
  } catch {
    /* ไม่มีเอกสาร/ยังไม่ได้ตั้ง bucket — ข้าม */
  }
  return out;
}

const num = (v: unknown) => Number(v ?? 0);
const str = (v: unknown) => (v == null ? "" : String(v));

export default async function LiffRoom() {
  const tenant = await getLiffTenant();
  if (!tenant) redirect("/liff/link");

  const admin = createAdminClient();
  // โหลดสัญญาก่อน แล้วใช้ห้องจากสัญญาถ้าผู้เช่าไม่ได้ผูกห้องตรง (tenant.room_id ว่าง)
  const contract = await loadContract(admin, tenant.id);
  const roomId = tenant.room_id ?? (contract?.room_id ? str(contract.room_id) : null);
  const contractId = contract?.id ? str(contract.id) : "";
  const [room, docs] = await Promise.all([
    loadRoom(admin, roomId),
    contractId ? loadDocs(admin, contractId) : Promise.resolve([]),
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
  const hasAny = sections.length > 0 || docs.length > 0;

  return (
    <div>
      <LiffHeader title="ข้อมูลห้อง / สัญญา" />
      {!hasAny ? (
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

          {/* เอกสารสัญญา — เปิดดู/ดาวน์โหลด */}
          {docs.length > 0 && (
            <div>
              <p className="mb-1.5 px-1 text-sm font-medium text-slate-500">เอกสารสัญญาเช่า</p>
              <div className="divide-y divide-slate-100 rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
                {docs.map((d) => (
                  <a
                    key={d.url}
                    href={d.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 px-4 py-3.5 active:bg-slate-50"
                  >
                    <FileText className="h-5 w-5 shrink-0 text-indigo-500" strokeWidth={2} />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{d.name}</span>
                    <Download className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={2} />
                  </a>
                ))}
              </div>
            </div>
          )}

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
