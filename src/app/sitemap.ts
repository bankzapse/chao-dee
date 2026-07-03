import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://www.chao-dee.com";
  const routes = [
    { path: "/", priority: 1.0, freq: "weekly" as const },
    { path: "/login", priority: 0.5, freq: "monthly" as const },
    { path: "/signup", priority: 0.8, freq: "monthly" as const },
    { path: "/privacy", priority: 0.3, freq: "yearly" as const },
    { path: "/terms", priority: 0.3, freq: "yearly" as const },
  ];
  return routes.map((r) => ({
    url: base + r.path,
    changeFrequency: r.freq,
    priority: r.priority,
  }));
}
