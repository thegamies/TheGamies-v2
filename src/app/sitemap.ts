import type { MetadataRoute } from "next";
import { resolvePublicOrigin } from "@/lib/seo/origin";
import { getSitemapCounts, sitemapUrlsForShard } from "@/lib/seo/sitemap-data";
import { sitemapShardsForCounts } from "@/lib/seo/sitemap-plan";

/** Catalog-backed; must not run at build time (CI has no DATABASE_URL). */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = await resolvePublicOrigin();
  if (!process.env.DATABASE_URL?.trim()) {
    return [];
  }
  const counts = await getSitemapCounts();
  const shards = sitemapShardsForCounts(counts);
  const urls: Array<{ path: string }> = [];
  for (const shard of shards) {
    urls.push(...(await sitemapUrlsForShard(shard)));
  }
  return urls.map((entry) => ({
    url: origin ? `${origin}${entry.path}` : entry.path,
  }));
}
