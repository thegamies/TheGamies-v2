export const SITEMAP_PAGE_SIZE = 5_000;

export const SITEMAP_STATIC_PATHS = [
  "/",
  "/games",
  "/game-of-the-year",
  "/about",
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
  "/communities/new",
  "/communities/join",
] as const;

export type SitemapKind = "static" | "games" | "profiles" | "lists" | "communities";

export type SitemapShard = {
  kind: SitemapKind;
  page: number;
};

export function sitemapPageCount(total: number, pageSize = SITEMAP_PAGE_SIZE): number {
  if (total <= 0) return 0;
  return Math.ceil(total / pageSize);
}

export function formatSitemapShardId(shard: SitemapShard): string {
  return shard.kind === "static" ? "static" : `${shard.kind}-${shard.page}`;
}

export function parseSitemapShardId(id: string): SitemapShard | null {
  if (id === "static") return { kind: "static", page: 0 };
  const match = /^(games|profiles|lists|communities)-(\d+)$/.exec(id);
  if (!match) return null;
  const page = Number(match[2]);
  if (!Number.isInteger(page) || page < 0) return null;
  return { kind: match[1] as Exclude<SitemapKind, "static">, page };
}

export function sitemapShardsForCounts(counts: {
  games: number;
  profiles: number;
  lists: number;
  communities: number;
}): SitemapShard[] {
  const shards: SitemapShard[] = [{ kind: "static", page: 0 }];
  const kinds = ["games", "profiles", "lists", "communities"] as const;
  for (const kind of kinds) {
    const pages = sitemapPageCount(counts[kind]);
    for (let page = 0; page < pages; page += 1) {
      shards.push({ kind, page });
    }
  }
  return shards;
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
