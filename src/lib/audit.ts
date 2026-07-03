import { createAdminClient } from "@/lib/supabase/admin";

export type AuditEntry = {
  org_id?: string | null;
  actor_id?: string | null;
  actor_name?: string;
  action: string;
  target?: string;
  meta?: Record<string, unknown>;
};

/** บันทึก audit log แบบ best-effort (ไม่ทำให้ action หลักล้มเหลว) */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    const admin = createAdminClient();
    let actorName = entry.actor_name ?? "";
    if (!actorName && entry.actor_id) {
      const { data } = await admin
        .from("profiles")
        .select("full_name")
        .eq("id", entry.actor_id)
        .maybeSingle();
      actorName = data?.full_name ?? "";
    }
    await admin.from("audit_logs").insert({
      org_id: entry.org_id ?? null,
      actor_id: entry.actor_id ?? null,
      actor_name: actorName,
      action: entry.action,
      target: entry.target ?? "",
      meta: entry.meta ?? {},
    });
  } catch {
    // เงียบไว้ — audit ล้มเหลวไม่ควรกระทบงานหลัก
  }
}
