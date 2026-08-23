import { and, asc, count, eq, isNotNull, isNull } from "drizzle-orm";
import { createDb } from "@thegamies/db";
import { communities, games, lists, profiles } from "@thegamies/db/schema";
import { listPublicStandingsYears } from "@/lib/live-aggregate/service";
import {
  ownedListSitemapPath,
  SITEMAP_PAGE_SIZE,
  SITEMAP_STATIC_PATHS,
  type SitemapShard,
} from "./sitemap-plan";

function getDb() {
  return createDb();
}

const publicGameWhere = and(isNull(games.igdbRemovedAt), eq(games.isAdult, false));
const publicProfileWhere = and(
  eq(profiles.visibility, "public"),
  isNull(profiles.deletedAt),
);

export async function getSitemapCounts(): Promise<{
  games: number;
  profiles: number;
  lists: number;
  communities: number;
}> {
  const db = getDb();
  const [gameRow] = await db
    .select({ value: count() })
    .from(games)
    .where(publicGameWhere);
  const [profileRow] = await db
    .select({ value: count() })
    .from(profiles)
    .where(publicProfileWhere);
  const [listRow] = await db
    .select({ value: count() })
    .from(lists)
    .innerJoin(profiles, eq(profiles.id, lists.profileId))
    .where(and(publicProfileWhere, isNotNull(lists.slug)));
  const [communityRow] = await db
    .select({ value: count() })
    .from(communities)
    .where(eq(communities.visibility, "public"));

  return {
    games: gameRow?.value ?? 0,
    profiles: profileRow?.value ?? 0,
    lists: listRow?.value ?? 0,
    communities: communityRow?.value ?? 0,
  };
}

export async function sitemapUrlsForShard(
  shard: SitemapShard,
): Promise<Array<{ path: string }>> {
  if (shard.kind === "static") {
    const years = await listPublicStandingsYears().catch(() => [] as number[]);
    return [
      ...SITEMAP_STATIC_PATHS.map((path) => ({ path })),
      ...years.map((year) => ({ path: `/game-of-the-year/${year}` })),
    ];
  }

  const db = getDb();
  const offset = shard.page * SITEMAP_PAGE_SIZE;

  if (shard.kind === "games") {
    const rows = await db
      .select({ slug: games.slug })
      .from(games)
      .where(publicGameWhere)
      .orderBy(asc(games.slug))
      .limit(SITEMAP_PAGE_SIZE)
      .offset(offset);
    return rows.map((row) => ({ path: `/games/${row.slug}` }));
  }

  if (shard.kind === "profiles") {
    const rows = await db
      .select({ username: profiles.username })
      .from(profiles)
      .where(publicProfileWhere)
      .orderBy(asc(profiles.username))
      .limit(SITEMAP_PAGE_SIZE)
      .offset(offset);
    return rows.map((row) => ({ path: `/u/${row.username}` }));
  }

  if (shard.kind === "lists") {
    const rows = await db
      .select({
        username: profiles.username,
        slug: lists.slug,
      })
      .from(lists)
      .innerJoin(profiles, eq(profiles.id, lists.profileId))
      .where(and(publicProfileWhere, isNotNull(lists.slug)))
      .orderBy(asc(profiles.username), asc(lists.slug))
      .limit(SITEMAP_PAGE_SIZE)
      .offset(offset);
    return rows
      .map((row) => ownedListSitemapPath(row))
      .filter((path): path is string => Boolean(path))
      .map((path) => ({ path }));
  }

  const rows = await db
    .select({ slug: communities.slug })
    .from(communities)
    .where(eq(communities.visibility, "public"))
    .orderBy(asc(communities.slug))
    .limit(SITEMAP_PAGE_SIZE)
    .offset(offset);
  return rows.map((row) => ({ path: `/communities/${row.slug}` }));
}
