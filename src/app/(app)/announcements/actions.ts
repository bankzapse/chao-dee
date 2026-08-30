"use server";

import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/access";
import { getOrgId } from "@/lib/auth";
import { pushMessage, textMessage, isLineConfigured } from "@/lib/line";
import type { FormState } from "@/components/action-form";

export async function createAnnouncement(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  if (!(await can("announcements:create"))) return { error: "ไม่มีสิทธิ์สร้างประกาศ" };
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "กรุณาระบุหัวข้อ" };

  const supabase = await createClient();
  const org_id = await getOrgId();
  const body = String(formData.get("body") ?? "").trim();
  const building_id = String(formData.get("building_id") ?? "").trim() || null;

  let { error } = await supabase.from("announcements").insert({ org_id, title, body, building_id });
  // resilient: เผื่อ prod ยังไม่รัน migration 0054 (คอลัมน์ building_id) → บันทึกแบบทุกอาคาร
  if (error && /building_id|schema cache|could not find/i.test(error.message)) {
    ({ error } = await supabase.from("announcements").insert({ org_id, title, body }));
  }
  if (error) return { error: error.message };
  return { ok: true };
}

/** ส่งประกาศไปยังผู้เช่าที่ผูก LINE แล้วทุกคนในองค์กร */
export async function sendAnnouncement(
  id: string
): Promise<{ ok?: boolean; error?: string; count?: number; failed?: number }> {
  if (!(await can("announcements:edit"))) return { error: "ไม่มีสิทธิ์ส่งประกาศ" };
  if (!isLineConfigured()) {
    return { error: "ยังไม่ได้ตั้งค่า LINE (ตั้งค่า LINE_CHANNEL_ACCESS_TOKEN ใน .env.local)" };
  }

  const supabase = await createClient();
  const { data: ann } = await supabase
    .from("announcements")
    .select("title, body")
    .eq("id", id)
    .single();
  if (!ann) return { error: "ไม่พบประกาศ" };

  // อาคารเป้าหมาย (resilient เผื่อยังไม่รัน migration 0054) — null = ทุกอาคาร
  const { data: bRow } = await supabase.from("announcements").select("building_id").eq("id", id).maybeSingle();
  const buildingId = (bRow as { building_id?: string } | null)?.building_id ?? null;

  // ผู้รับ: ผู้เช่าที่ผูก LINE — ถ้าระบุอาคาร กรองเฉพาะผู้เช่าที่ "อยู่" ในอาคารนั้น
  // การอยู่อาคาร = ห้องผูกตรง (tenant.room_id) หรือ มีสัญญา active กับห้องในอาคาร
  // (ต้องเช็คทั้งสองทาง เหมือนหน้าผู้เช่า ไม่งั้นผู้เช่าที่ผูกห้องผ่านสัญญาจะตกหล่น)
  let targets: string[];
  if (buildingId) {
    const { data: rooms } = await supabase.from("rooms").select("id").eq("building_id", buildingId);
    const roomIds = new Set((rooms ?? []).map((r) => r.id as string));
    if (roomIds.size === 0) return { ok: true, count: 0 };

    const [{ data: tenants }, { data: contracts }] = await Promise.all([
      supabase.from("tenants").select("id, line_user_id, room_id").neq("line_user_id", ""),
      supabase.from("contracts").select("tenant_id, room_id").eq("status", "active"),
    ]);
    const inBuildingByContract = new Set(
      (contracts ?? [])
        .filter((c: { room_id?: string }) => c.room_id && roomIds.has(c.room_id))
        .map((c: { tenant_id: string }) => c.tenant_id)
    );
    targets = [
      ...new Set(
        (tenants ?? [])
          .filter((t: { id: string; room_id?: string }) => (t.room_id && roomIds.has(t.room_id)) || inBuildingByContract.has(t.id))
          .map((t: { line_user_id: string }) => t.line_user_id)
          .filter(Boolean)
      ),
    ];
  } else {
    const { data: tenants } = await supabase.from("tenants").select("line_user_id").neq("line_user_id", "");
    targets = [...new Set((tenants ?? []).map((t: { line_user_id: string }) => t.line_user_id).filter(Boolean))];
  }
  const message = textMessage(`📢 ${ann.title}\n\n${ann.body}`);

  let count = 0;
  let failed = 0;
  for (const uid of targets) {
    const res = await pushMessage(uid, [message]);
    if (res.ok) count++;
    else {
      failed++;
      // ส่วนใหญ่ 400/403 = ผู้เช่าไม่ได้เป็นเพื่อน/บล็อก OA (push ต้องเป็นเพื่อนเท่านั้น)
      console.warn(`ประกาศ ${id}: push ล้มเหลว status=${res.status} ${res.error ?? ""}`);
    }
  }

  await supabase
    .from("announcements")
    .update({ sent_at: new Date().toISOString(), recipients: count })
    .eq("id", id);

  return { ok: true, count, failed };
}

export async function deleteAnnouncement(id: string): Promise<void> {
  if (!(await can("announcements:delete"))) return;
  const supabase = await createClient();
  await supabase.from("announcements").delete().eq("id", id);
}
