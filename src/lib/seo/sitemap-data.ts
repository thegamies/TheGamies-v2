import { asc, count, eq, sql } from "drizzle-orm";
import { createDb } from "@thegamies/db";
import { communities } from "@thegamies/db/schema";
import { listPublicStandingsYears } from "@/lib/live-aggregate/service";
import {
  SITEMAP_GAMES_PER_YEAR,
  SITEMAP_PAGE_SIZE,
  SITEMAP_STATIC_PATHS,
  type SitemapShard,
} from "./sitemap-plan";

function getDb() {
  return createDb();
}

/** Top `SITEMAP_GAMES_PER_YEAR` slugs per release year, by IGDB popularity. */
const popularGamesByYear = sql`
  select slug
  from (
    select
      slug,
      row_number() over (
        partition by year
        order by popularity desc, slug asc
      ) as rn
    from games
    where igdb_removed_at is null
      and is_adult = false
      and year is not null
  ) ranked
  where rn <= ${SITEMAP_GAMES_PER_YEAR}
`;

export async function getSitemapCounts(): Promise<{
  games: number;
  communities: number;
}> {
  const db = getDb();
  const gamesResult = await db.execute(sql`
    select count(*)::int as value
    from (${popularGamesByYear}) popular_games
  `);
  const [communityRow] = await db
    .select({ value: count() })
    .from(communities)
    .where(eq(communities.visibility, "public"));

  return {
    games: Number(gamesResult.rows[0]?.value ?? 0),
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
    const result = await db.execute(sql`
      ${popularGamesByYear}
      order by slug
      limit ${SITEMAP_PAGE_SIZE}
      offset ${offset}
    `);
    return result.rows
      .map((row) => {
        const slug = typeof row.slug === "string" ? row.slug : null;
        return slug ? { path: `/games/${slug}` } : null;
      })
      .filter((entry): entry is { path: string } => Boolean(entry));
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
