import { redirect } from "next/navigation";

// marketplace ย้ายไป /rent แล้ว — คงลิงก์เดิมไว้ให้ redirect
export default async function PropertyRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const qs = new URLSearchParams(
    Object.entries(sp).filter(([, v]) => v) as [string, string][]
  ).toString();
  redirect(qs ? `/rent?${qs}` : "/rent");
}
