"use server";

import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/auth";

/** โหลดข้อมูลตัวอย่างให้องค์กรปัจจุบัน เพื่อทดลองใช้งานได้ทันที */
export async function seedDemoData(): Promise<void> {
  const supabase = await createClient();
  const org_id = await getOrgId();

  // 1) อาคาร (floors อาจยังไม่มีคอลัมน์ถ้ายังไม่ได้รัน migration → fallback)
  const buildingBase = { org_id, name: "อาคารตัวอย่าง A", address: "123 ถ.สุขุมวิท กรุงเทพฯ", note: "" };
  let ins = await supabase.from("buildings").insert({ ...buildingBase, floors: 2 }).select("id").single();
  if (ins.error && /schema cache|could not find/i.test(ins.error.message)) {
    ins = await supabase.from("buildings").insert(buildingBase).select("id").single();
  }
  const building = ins.data;
  if (!building) return;

  // 2) ห้องพัก 8 ห้อง
  const roomsPayload = Array.from({ length: 8 }, (_, i) => {
    const floor = Math.floor(i / 4) + 1;
    const num = `${floor}0${(i % 4) + 1}`;
    return {
      building_id: building.id,
      room_number: num,
      floor,
      size_sqm: 24,
      base_rent: 4500 + (i % 3) * 500,
      water_rate: 18,
      electricity_rate: 8,
      status: "vacant" as const,
      note: "",
    };
  });
  const { data: rooms } = await supabase
    .from("rooms")
    .insert(roomsPayload)
    .select("id, base_rent");

  // 3) ผู้เช่า
  const { data: tenants } = await supabase
    .from("tenants")
    .insert([
      { org_id, full_name: "สมชาย ใจดี", phone: "0811111111", email: "somchai@example.com" },
      { org_id, full_name: "สุดา รักเรียน", phone: "0822222222", email: "suda@example.com" },
      { org_id, full_name: "อนันต์ มั่งมี", phone: "0833333333", email: "anan@example.com" },
    ])
    .select("id");

  // 4) สัญญาเช่า 3 ห้องแรก + อัปเดตสถานะห้องเป็นมีผู้เช่า
  if (rooms && tenants) {
    const today = new Date();
    const start = today.toISOString().slice(0, 10);
    const end = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate())
      .toISOString()
      .slice(0, 10);

    const contracts = tenants.map((t, i) => ({
      org_id,
      room_id: rooms[i].id,
      tenant_id: t.id,
      start_date: start,
      end_date: end,
      rent_amount: rooms[i].base_rent,
      deposit_amount: Number(rooms[i].base_rent) * 2,
      status: "active" as const,
    }));
    await supabase.from("contracts").insert(contracts);
    await supabase
      .from("rooms")
      .update({ status: "occupied" })
      .in(
        "id",
        rooms.slice(0, 3).map((r) => r.id)
      );
  }

  // 5) ค่าใช้จ่ายตัวอย่าง
  const d = new Date().toISOString().slice(0, 10);
  await supabase.from("building_expenses").insert([
    { org_id, building_id: building.id, category: "ค่าน้ำส่วนกลาง", amount: 1200, expense_date: d },
    { org_id, building_id: building.id, category: "ค่าไฟส่วนกลาง", amount: 2400, expense_date: d },
    { org_id, building_id: building.id, category: "ค่าทำความสะอาด", amount: 3000, expense_date: d },
  ]);

  // 6) ตั้งค่า PromptPay ให้พร้อมออกบิล
  await supabase
    .from("organizations")
    .update({
      promptpay_id: "0812345678",
      promptpay_name: "หอพักสุขใจ (Demo)",
      invoice_note: "กรุณาชำระภายในวันครบกำหนด ขอบคุณครับ",
    })
    .eq("id", org_id);

  // 7) ค่ามิเตอร์ 2 รอบ (ก่อนหน้า + ปัจจุบัน) ให้ 3 ห้องที่มีสัญญา เพื่อให้คำนวณหน่วยได้
  if (rooms) {
    const now = new Date();
    const cur = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const prevD = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prev = `${prevD.getFullYear()}-${String(prevD.getMonth() + 1).padStart(2, "0")}`;
    const prevDate = prevD.toISOString().slice(0, 10);

    const readings = [];
    for (let i = 0; i < 3; i++) {
      const baseW = 100 + i * 20;
      const baseE = 500 + i * 100;
      readings.push({
        org_id, room_id: rooms[i].id, period: prev,
        water_value: baseW, electric_value: baseE, reading_date: prevDate,
      });
      readings.push({
        org_id, room_id: rooms[i].id, period: cur,
        water_value: baseW + 8 + i, electric_value: baseE + 85 + i * 10, reading_date: d,
      });
    }
    await supabase.from("meter_readings").insert(readings);
  }
}
