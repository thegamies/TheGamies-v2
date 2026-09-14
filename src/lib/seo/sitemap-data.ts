import { asc, count, eq, sql } from "drizzle-orm";
import { communities, createDb } from "@thegamies/db";
import { listPublicStandingsYears } from "@/lib/live-aggregate/service";
import { siteGotySitemapYearPaths } from "@/lib/live-aggregate/award-category-defs";
import { listTgaYears } from "@/lib/tga-pickem/service";
import {
  SITEMAP_GAMES_MAX,
  SITEMAP_PAGE_SIZE,
  SITEMAP_STATIC_PATHS,
  type SitemapShard,
} from "./sitemap-plan";

function getDb() {
  return createDb();
}

/**
 * Games with original site value: public GOTY presence, a public category #1,
 * or appearance on a public owned list. Starts from score/list tables, not
 * the full catalog.
 */
function valuedGamesSql() {
  return sql`
    select g.slug
    from (
      select s.game_id
      from live_goty_scores s
      left join live_goty_year_stats ys on ys.year = s.year
      left join site_settings ss on ss.id = 'default'
      where coalesce(ys.list_count, 0) >= coalesce(ss.public_board_min_lists, 5)
      union
      select w.game_id
      from live_category_scores w
      inner join (
        select year, category_id, coalesce(sum(vote_count), 0)::int as total
        from live_category_scores
        group by year, category_id
      ) cv on cv.year = w.year and cv.category_id = w.category_id
      cross join (
        select coalesce(
          (select public_board_min_category_votes from site_settings where id = 'default'),
          5
        )::int as min
      ) f
      where cv.total >= f.min
        and not exists (
          select 1
          from live_category_scores other
          where other.year = w.year
            and other.category_id = w.category_id
            and other.vote_count > w.vote_count
        )
      union
      select li.game_id
      from list_items li
      inner join lists l on l.id = li.list_id
      inner join profiles p on p.id = l.profile_id
      where l.rank_visibility is distinct from 'hidden'
        and p.visibility = 'public'
        and p.deleted_at is null
        and p.is_seed = false
    ) valued
    inner join games g on g.id = valued.game_id
    where g.igdb_removed_at is null
      and g.is_adult = false
  `;
}

export async function getSitemapCounts(): Promise<{
  games: number;
  communities: number;
}> {
  const db = getDb();
  const valuedGames = valuedGamesSql();
  const gamesResult = await db.execute(sql`
    select least(count(*)::int, ${SITEMAP_GAMES_MAX}) as value
    from (${valuedGames}) valued_games
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
      ...siteGotySitemapYearPaths(years).map((path) => ({ path })),
      ...tgaYears.map((year) => ({ path: `/the-game-awards/${year}` })),
    ];
  }

  const db = getDb();
  const offset = shard.page * SITEMAP_PAGE_SIZE;

  if (shard.kind === "games") {
    const remaining = Math.max(0, SITEMAP_GAMES_MAX - offset);
    if (remaining === 0) return [];
    const valuedGames = valuedGamesSql();
    const result = await db.execute(sql`
      ${valuedGames}
      order by slug
      limit ${Math.min(SITEMAP_PAGE_SIZE, remaining)}
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
