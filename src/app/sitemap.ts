import type { MetadataRoute } from "next";
import { appOrigin } from "@/lib/seo/site";
import { getSitemapCounts, sitemapUrlsForShard } from "@/lib/seo/sitemap-data";
import { sitemapShardsForCounts } from "@/lib/seo/sitemap-plan";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = appOrigin();
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
