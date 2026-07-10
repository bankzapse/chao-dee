import { redirect } from "next/navigation";

// รายละเอียดประกาศย้ายไป /rent/[slug] แล้ว
export default async function PropertyDetailRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/rent/${slug}`);
}
