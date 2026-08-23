import type { MetadataRoute } from "next";
import { appOrigin } from "@/lib/seo/site";
import { ROBOTS_DISALLOW } from "@/lib/seo/sitemap-plan";

export default function robots(): MetadataRoute.Robots {
  const origin = appOrigin();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...ROBOTS_DISALLOW],
    },
    sitemap: origin ? `${origin}/sitemap.xml` : undefined,
  };
}
