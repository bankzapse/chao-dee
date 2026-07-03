import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { TeamUI } from "./team-ui";

export type Member = { id: string; full_name: string; phone: string; role: string };
export type Invitation = {
  id: string;
  phone: string;
  full_name: string;
  role: string;
  created_at: string;
};

export default async function TeamPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("id, org_id, role")
    .eq("id", user.id)
    .single();

  // เฉพาะเจ้าของ/แอดมินเท่านั้นที่จัดการทีมได้
  if (!me || !["owner", "admin"].includes(me.role)) redirect("/dashboard");

  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, phone, role")
      .eq("org_id", me.org_id)
      .order("role", { ascending: true }),
    supabase
      .from("invitations")
      .select("id, phone, full_name, role, created_at")
      .eq("org_id", me.org_id)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div>
      <PageHeader
        title="ทีมงาน"
        subtitle="เชิญและจัดการผู้ใช้ที่เข้าถึงกิจการของคุณ"
      />
      <TeamUI
        myId={me.id}
        myRole={me.role}
        members={(members ?? []) as Member[]}
        invites={(invites ?? []) as Invitation[]}
      />
    </div>
  );
}
