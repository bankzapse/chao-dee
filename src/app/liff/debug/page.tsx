import { readLiffSession, getLiffTenant } from "@/lib/liff";
import { createAdminClient } from "@/lib/supabase/admin";
import { LiffInit } from "../liff-init";

// หน้า debug ชั่วคราว — ดูว่า sub (LINE id) ตรงกับ line_user_id ใน DB ไหม
export const dynamic = "force-dynamic";

function tail(s?: string | null, n = 10) {
  if (!s) return "(ว่าง)";
  return "…" + s.slice(-n);
}

export default async function LiffDebug({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string }>;
}) {
  const sess = await readLiffSession();
  if (!sess) return <LiffInit liffId={process.env.NEXT_PUBLIC_LIFF_ID ?? ""} />;

  const { phone } = await searchParams;
  const admin = createAdminClient();

  const { data: bySub } = await admin
    .from("tenants")
    .select("id, full_name, line_user_id, phone")
    .eq("line_user_id", sess.sub)
    .maybeSingle();

  let byPhone: { id: string; full_name: string; line_user_id: string; phone: string }[] | null =
    null;
  if (phone) {
    const r = await admin
      .from("tenants")
      .select("id, full_name, line_user_id, phone")
      .eq("phone", phone);
    byPhone = r.data ?? null;
  }

  const tenant = await getLiffTenant();

  const out = {
    session: { subTail: tail(sess.sub), tenantId: sess.tenantId },
    getLiffTenant: tenant
      ? { id: tenant.id, name: tenant.full_name, matchesSub: tenant.line_user_id === sess.sub }
      : null,
    tenantWithThisLineId: bySub
      ? { id: bySub.id, name: bySub.full_name, phone: bySub.phone }
      : "ไม่มีผู้เช่าที่ผูกกับ LINE นี้",
    tenantByPhone:
      byPhone?.map((t) => ({
        id: t.id,
        name: t.full_name,
        phone: t.phone,
        lineIdTail: tail(t.line_user_id),
        lineIdEmpty: t.line_user_id === "",
        matchesThisSub: t.line_user_id === sess.sub,
      })) ?? "ไม่ได้ส่ง ?phone= มา",
  };

  return (
    <pre style={{ fontSize: 12, whiteSpace: "pre-wrap", padding: 12 }}>
      {JSON.stringify(out, null, 2)}
    </pre>
  );
}
