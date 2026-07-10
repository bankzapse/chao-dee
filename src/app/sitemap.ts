import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://www.chao-dee.com";
  const routes = [
    { path: "/", priority: 1.0, freq: "weekly" as const },
    { path: "/property", priority: 0.9, freq: "daily" as const },
    { path: "/login", priority: 0.5, freq: "monthly" as const },
    { path: "/signup", priority: 0.8, freq: "monthly" as const },
    { path: "/privacy", priority: 0.3, freq: "yearly" as const },
    { path: "/terms", priority: 0.3, freq: "yearly" as const },
  ];

  const entries: MetadataRoute.Sitemap = routes.map((r) => ({
    url: base + r.path,
    changeFrequency: r.freq,
    priority: r.priority,
  }));

  // ประกาศที่เผยแพร่แล้ว — เพิ่มเข้า sitemap เพื่อ SEO (ข้ามถ้ายังไม่ได้ migrate)
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("property_listings")
      .select("slug, created_at")
      .eq("is_published", true);
    (data ?? []).forEach((l: { slug: string; created_at: string }) => {
      entries.push({
        url: `${base}/property/${l.slug}`,
        changeFrequency: "weekly",
        priority: 0.7,
        lastModified: l.created_at ? new Date(l.created_at) : undefined,
      });
    });
  } catch {
    // ยังไม่มีตาราง — ข้ามไป
  }

  return entries;
}
