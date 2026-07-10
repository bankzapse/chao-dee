import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // ไม่ให้ index ส่วนที่ต้องล็อกอิน/ภายใน
      disallow: ["/dashboard", "/listing", "/owner", "/owner-login", "/renew", "/subscription-required", "/api/", "/bill", "/rent/manage", "/property"],
    },
    sitemap: "https://www.chao-dee.com/sitemap.xml",
  };
}
