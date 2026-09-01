import { asc, count, eq, sql } from "drizzle-orm";
import { createDb } from "@thegamies/db";
import { communities } from "@thegamies/db/schema";
import { listPublicStandingsYears } from "@/lib/live-aggregate/service";
import { listTgaYears } from "@/lib/tga-pickem/service";
import {
  SITEMAP_GAMES_PER_YEAR,
  SITEMAP_PAGE_SIZE,
  SITEMAP_STATIC_PATHS,
  sitemapCatalogYears,
  type SitemapShard,
} from "./sitemap-plan";

function getDb() {
  return createDb();
}

/** Top `SITEMAP_GAMES_PER_YEAR` slugs per included catalog year, by IGDB popularity. */
function popularGamesSql(years: readonly number[]) {
  if (years.length === 0) {
    return sql`select slug from games where false`;
  }
  return sql`
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
        and year in (${sql.join(years.map((year) => sql`${year}`), sql`, `)})
    ) ranked
    where rn <= ${SITEMAP_GAMES_PER_YEAR}
  `;
}

export async function getSitemapCounts(): Promise<{
  games: number;
  communities: number;
}> {
  const db = getDb();
  const popularGames = popularGamesSql(sitemapCatalogYears());
  const gamesResult = await db.execute(sql`
    select count(*)::int as value
    from (${popularGames}) popular_games
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
    const tgaYears = await listTgaYears()
      .then((rows) => rows.filter((row) => row.enabled).map((row) => row.year))
      .catch(() => [] as number[]);
    return [
      ...SITEMAP_STATIC_PATHS.map((path) => ({ path })),
      ...years.map((year) => ({ path: `/game-of-the-year/${year}` })),
      ...tgaYears.map((year) => ({ path: `/the-game-awards/${year}` })),
    ];
  }

  const db = getDb();
  const offset = shard.page * SITEMAP_PAGE_SIZE;

  if (shard.kind === "games") {
    const popularGames = popularGamesSql(sitemapCatalogYears());
    const result = await db.execute(sql`
      ${popularGames}
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
