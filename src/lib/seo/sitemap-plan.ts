export const SITEMAP_PAGE_SIZE = 5_000;

/** Hard cap on valued catalog URLs in the sitemap (not the full IGDB dump). */
export const SITEMAP_GAMES_MAX = 5_000;

export const SITEMAP_STATIC_PATHS = [
  "/",
  "/games",
  "/game-of-the-year",
  "/rankings",
  "/people",
  "/the-game-awards",
  "/about",
  "/about/lists",
  "/about/communities",
  "/about/library",
  "/about/people",
  "/about/pickem",
  "/contact",
  "/guidelines",
  "/terms",
  "/privacy",
] as const;

export const ROBOTS_DISALLOW = [
  "/admin",
  "/account",
  "/create",
  "/auth",
  "/design-system",
  "/dev",
  "/following",
  "/communities/new",
  "/communities/join",
] as const;

export type SitemapKind = "static" | "games" | "communities";

export type SitemapShard = {
  kind: SitemapKind;
  page: number;
};

/** Catalog years whose game pages go in the sitemap: this year and last year (UTC). */
export function sitemapCatalogYears(now: Date = new Date()): number[] {
  const year = now.getUTCFullYear();
  return Array.from(
    { length: 2 },
    (_, index) => year - index,
  );
}

export function sitemapPageCount(total: number, pageSize = SITEMAP_PAGE_SIZE): number {
  if (total <= 0) return 0;
  return Math.ceil(total / pageSize);
}

export function formatSitemapShardId(shard: SitemapShard): string {
  return shard.kind === "static" ? "static" : `${shard.kind}-${shard.page}`;
}

export function parseSitemapShardId(id: string): SitemapShard | null {
  if (id === "static") return { kind: "static", page: 0 };
  const match = /^(games|communities)-(\d+)$/.exec(id);
  if (!match) return null;
  const page = Number(match[2]);
  if (!Number.isInteger(page) || page < 0) return null;
  return { kind: match[1] as Exclude<SitemapKind, "static">, page };
}

export function sitemapShardsForCounts(counts: {
  games: number;
  communities: number;
}): SitemapShard[] {
  const shards: SitemapShard[] = [{ kind: "static", page: 0 }];
  const kinds = ["games", "communities"] as const;
  for (const kind of kinds) {
    const pages = sitemapPageCount(counts[kind]);
    for (let page = 0; page < pages; page += 1) {
      shards.push({ kind, page });
    }
  }
  return shards;
}

export function shouldIndexGamesHub(page: number): boolean {
  return Number.isFinite(page) && page <= 1;
}

export function shouldIndexProfile(input: {
  visibility: string;
  deletedAt?: Date | null;
}): boolean {
  return input.visibility === "public" && input.deletedAt == null;
}

export function ownedListSitemapPath(input: {
  username: string;
  slug: string | null;
}): string | null {
  if (!input.username || !input.slug) return null;
  return `/u/${input.username}/${input.slug}`;
}

