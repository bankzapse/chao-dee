import { redirect } from "next/navigation";
import { getLiffTenant } from "@/lib/liff";
import { LinkPrompt } from "../link-prompt";

/** หน้าผูกบัญชี — ผูกผ่านแชท (ดู LinkPrompt) · ถ้าผูกแล้วเด้งเข้าเมนู */
export default async function LiffLinkPage() {
  const tenant = await getLiffTenant();
  if (tenant) redirect("/liff");
  return <LinkPrompt />;
}
