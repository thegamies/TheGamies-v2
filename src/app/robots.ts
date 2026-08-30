import type { MetadataRoute } from "next";
import { resolvePublicOrigin } from "@/lib/seo/origin";
import { ROBOTS_DISALLOW } from "@/lib/seo/sitemap-plan";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const origin = await resolvePublicOrigin();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...ROBOTS_DISALLOW],
    },
    sitemap: origin ? `${origin}/sitemap.xml` : undefined,
  };
}
