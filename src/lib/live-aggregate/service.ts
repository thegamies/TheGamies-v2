import { eq, sql } from "drizzle-orm";
import { withDisplayRanks, withDisplayRanksOnPage } from "@/lib/standings/shared-rank";
import { liveGotyYearStats, type Db } from "@thegamies/db";
import { getLiveAggregateDb } from "./contrib";
import { ensureScoresFresh } from "./refresh";
import {
  DEFAULT_AWARD_CATEGORY_GROUP,
  parseAwardCategoryGroup,
  type AwardCategoryGroup,
} from "./award-category-defs";

/** GOTY standings rows per page on `/game-of-the-year/[year]`. */
export const STANDINGS_PAGE_SIZE = 50;

export type StandingsGameRow = {
  place: number;
  gameId: string;
  slug: string;
  title: string;
  year: number | null;
  coverUrl: string | null;
  score: number | null;
  listMentions: number | null;
  rankCounts: number[] | null;
};

export type CategoryStandingRow = {
  place: number;
  gameId: string;
  slug: string;
  title: string;
  coverUrl: string | null;
  voteCount: number | null;
};

export type CategoryStandingsBlock = {
  categoryId: string;
  label: string;
  description: string | null;
  rows: CategoryStandingRow[];
};

export type StandingsPage = {
  year: number;
  listCount: number;
  detailedStatsRevealed: boolean;
  standingsVersion: number;
  scoresFresh: boolean;
  /** 1-based page of GOTY rows. */
  page: number;
  pageSize: number;
  gotyTotal: number;
  totalPages: number;
  goty: StandingsGameRow[];
  categories: CategoryStandingsBlock[];
  categoryGroup: AwardCategoryGroup;
};

/** Clamp a requested page number to a valid 1-based index. */
export function clampStandingsPage(
  requested: number,
  totalPages: number,
): number {
  const pages = Math.max(1, Math.floor(totalPages));
  const page = Math.floor(requested);
  if (!Number.isFinite(page) || page < 1) return 1;
  return Math.min(page, pages);
}

function coverUrlFrom(
  imageId: string | null | undefined,
): string | null {
  if (!imageId) return null;
  return `https://images.igdb.com/igdb/image/upload/t_cover_big/${imageId}.jpg`;
}

function asInt(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asBool(value: unknown): boolean {
  return value === true || value === "t" || value === "true";
}

function parseJsonArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function redactStandingsPage(
  page: StandingsPage,
  opts: { forceReveal?: boolean } = {},
): StandingsPage {
  if (opts.forceReveal || page.detailedStatsRevealed) return page;
  return {
    ...page,
    goty: page.goty.map((row) => ({
      ...row,
      score: null,
      listMentions: null,
      rankCounts: null,
    })),
    categories: page.categories.map((block) => ({
      ...block,
      rows: block.rows.map((row) => ({
        ...row,
        voteCount: null,
      })),
    })),
  };
}

export async function getYearStats(
  year: number,
  db: Db = getLiveAggregateDb(),
) {
  const [stats] = await db
    .select()
    .from(liveGotyYearStats)
    .where(eq(liveGotyYearStats.year, year))
    .limit(1);
  return (
    stats ?? {
      year,
      listCount: 0,
      detailedStatsRevealed: false,
      contribGeneration: 0,
      scoresGeneration: 0,
      standingsVersion: 0,
      refreshing: false,
      refreshStartedAt: null,
    }
  );
}

type StandingsBundleRow = {
  list_count: unknown;
  detailed_stats_revealed: unknown;
  contrib_generation: unknown;
  scores_generation: unknown;
  standings_version: unknown;
  goty_total: unknown;
  page: unknown;
  total_pages: unknown;
  higher_count: unknown;
  goty: unknown;
  categories: unknown;
};

type GotyJsonRow = {
  place: number;
  gameId: string;
  slug: string;
  title: string;
  year: number | null;
  coverImageId: string | null;
  score: number;
  listMentions: number;
  rank1Count: number;
  rank2Count: number;
  rank3Count: number;
  rank4Count: number;
  rank5Count: number;
  rank6Count: number;
  rank7Count: number;
  rank8Count: number;
  rank9Count: number;
  rank10Count: number;
};

type CategoryJsonRow = {
  categoryId: string;
  label: string;
  description: string | null;
  sortOrder: number;
  place: number | null;
  gameId: string | null;
  slug: string | null;
  title: string | null;
  coverImageId: string | null;
  voteCount: number | null;
};

/**
 * One Neon round-trip for the public GOTY rankings board:
 * year stats + total + page of scores + category tallies.
 */
async function fetchStandingsBundle(
  year: number,
  requestedPage: number,
  pageSize: number,
  categoryGroup: AwardCategoryGroup,
  db: Db,
): Promise<Omit<StandingsPage, "year" | "pageSize" | "scoresFresh"> & {
  contribGeneration: number;
  scoresGeneration: number;
}> {
  const result = await db.execute(sql`
    with meta as (
      select
        coalesce(ys.list_count, 0)::int as list_count,
        coalesce(ys.detailed_stats_revealed, false) as detailed_stats_revealed,
        coalesce(ys.contrib_generation, 0)::int as contrib_generation,
        coalesce(ys.scores_generation, 0)::int as scores_generation,
        coalesce(ys.standings_version, 0)::int as standings_version,
        (
          select count(*)::int
          from live_goty_scores
          where year = ${year}
        ) as goty_total
      from (select ${year}::int as year) y
      left join live_goty_year_stats ys on ys.year = y.year
    ),
    bounds as (
      select
        meta.*,
        greatest(
          1,
          ceil(meta.goty_total::numeric / ${pageSize}::numeric)
        )::int as total_pages,
        least(
          greatest(${requestedPage}::int, 1),
          greatest(
            1,
            ceil(meta.goty_total::numeric / ${pageSize}::numeric)
          )::int
        ) as page
      from meta
    )
    select
      b.list_count,
      b.detailed_stats_revealed,
      b.contrib_generation,
      b.scores_generation,
      b.standings_version,
      b.goty_total,
      b.page,
      b.total_pages,
      (
        select count(*)::int
        from live_goty_scores hs
        where hs.year = ${year}
          and hs.score > (
            select s0.score
            from live_goty_scores s0
            where s0.year = ${year}
            order by s0.score desc, s0.game_id asc
            offset (b.page - 1) * ${pageSize}
            limit 1
          )
      ) as higher_count,
      coalesce(
        (
          select json_agg(row_to_json(p) order by p."place")
          from (
            select
              ((b.page - 1) * ${pageSize} + row_number() over (
                order by s.score desc, s.game_id asc
              ))::int as "place",
              s.game_id as "gameId",
              g.slug as "slug",
              g.title as "title",
              g.year as "year",
              c.image_id as "coverImageId",
              s.score as "score",
              s.list_mentions as "listMentions",
              s.rank_1_count as "rank1Count",
              s.rank_2_count as "rank2Count",
              s.rank_3_count as "rank3Count",
              s.rank_4_count as "rank4Count",
              s.rank_5_count as "rank5Count",
              s.rank_6_count as "rank6Count",
              s.rank_7_count as "rank7Count",
              s.rank_8_count as "rank8Count",
              s.rank_9_count as "rank9Count",
              s.rank_10_count as "rank10Count"
            from live_goty_scores s
            inner join games g on g.id = s.game_id
            left join covers c on c.igdb_id = g.cover_igdb_id
            where s.year = ${year}
            order by s.score desc, s.game_id asc
            limit ${pageSize}
            offset (b.page - 1) * ${pageSize}
          ) p
        ),
        '[]'::json
      ) as goty,
      coalesce(
        (
          select json_agg(row_to_json(cat) order by cat."sortOrder", cat."label", cat."place" nulls last)
          from (
            select
              ac.id as "categoryId",
              ac.label as "label",
              ac.description as "description",
              ac.sort_order as "sortOrder",
              r.place as "place",
              r.game_id as "gameId",
              r.slug as "slug",
              r.title as "title",
              r.cover_image_id as "coverImageId",
              r.vote_count as "voteCount"
            from award_categories ac
            left join lateral (
              select
                row_number() over (
                  order by s.vote_count desc, s.game_id asc
                )::int as place,
                s.game_id,
                g.slug,
                g.title,
                cov.image_id as cover_image_id,
                s.vote_count
              from live_category_scores s
              inner join games g on g.id = s.game_id
              left join covers cov on cov.igdb_id = g.cover_igdb_id
              where s.year = ${year}
                and s.category_id = ac.id
              order by s.vote_count desc, s.game_id asc
              limit 10
            ) r on true
            where ac.active = true
              and ac.category_group = ${categoryGroup}
          ) cat
        ),
        '[]'::json
      ) as categories
    from bounds b
  `);

  const row = result.rows[0] as StandingsBundleRow | undefined;
  if (!row) {
    return {
      listCount: 0,
      detailedStatsRevealed: false,
      standingsVersion: 0,
      contribGeneration: 0,
      scoresGeneration: 0,
      page: 1,
      gotyTotal: 0,
      totalPages: 1,
      goty: [],
      categories: [],
      categoryGroup,
    };
  }

  const gotyRaw: StandingsGameRow[] = parseJsonArray<GotyJsonRow>(row.goty).map(
    (g) => ({
      place: asInt(g.place),
      gameId: String(g.gameId),
      slug: String(g.slug),
      title: String(g.title),
      year: g.year == null ? null : asInt(g.year),
      coverUrl: coverUrlFrom(g.coverImageId),
      score: asInt(g.score),
      listMentions: asInt(g.listMentions),
      rankCounts: [
        asInt(g.rank1Count),
        asInt(g.rank2Count),
        asInt(g.rank3Count),
        asInt(g.rank4Count),
        asInt(g.rank5Count),
        asInt(g.rank6Count),
        asInt(g.rank7Count),
        asInt(g.rank8Count),
        asInt(g.rank9Count),
        asInt(g.rank10Count),
      ],
    }),
  );
  const page = asInt(row.page, 1);
  const goty = withDisplayRanksOnPage(
    gotyRaw,
    (r) => r.score ?? 0,
    {
      offset: (page - 1) * pageSize,
      firstGroupRank: asInt(row.higher_count) + 1,
      mode: "competition",
    },
  ).map((r) => ({ ...r, place: r.rank }));

  const categoryRows = parseJsonArray<CategoryJsonRow>(row.categories);
  const byId = new Map<string, CategoryStandingsBlock>();
  for (const cat of categoryRows) {
    let block = byId.get(cat.categoryId);
    if (!block) {
      block = {
        categoryId: cat.categoryId,
        label: cat.label,
        description: cat.description,
        rows: [],
      };
      byId.set(cat.categoryId, block);
    }
    if (cat.gameId && cat.slug && cat.title && cat.place != null) {
      block.rows.push({
        place: asInt(cat.place),
        gameId: cat.gameId,
        slug: cat.slug,
        title: cat.title,
        coverUrl: coverUrlFrom(cat.coverImageId),
        voteCount: cat.voteCount == null ? null : asInt(cat.voteCount),
      });
    }
  }
  for (const block of byId.values()) {
    block.rows = withDisplayRanks(
      block.rows,
      (r) => r.voteCount ?? 0,
      "competition",
    ).map((r) => ({ ...r, place: r.rank }));
  }

  return {
    listCount: asInt(row.list_count),
    detailedStatsRevealed: asBool(row.detailed_stats_revealed),
    standingsVersion: asInt(row.standings_version),
    contribGeneration: asInt(row.contrib_generation),
    scoresGeneration: asInt(row.scores_generation),
    page,
    gotyTotal: asInt(row.goty_total),
    totalPages: asInt(row.total_pages, 1),
    goty,
    categories: [...byId.values()],
    categoryGroup,
  };
}

export async function getStandingsPage(
  year: number,
  opts: {
    ensureFresh?: boolean;
    forceReveal?: boolean;
    page?: number;
    pageSize?: number;
    categoryGroup?: AwardCategoryGroup;
  } = {},
  db: Db = getLiveAggregateDb(),
): Promise<StandingsPage> {
  // Opt-in only: standings reads skip lazy refresh by default (Neon HTTP
  // round-trips). Saves already schedule tryRefreshYear via after().
  if (opts.ensureFresh === true) {
    await ensureScoresFresh(year, db);
  }

  const pageSize = Math.min(
    200,
    Math.max(1, Math.floor(opts.pageSize ?? STANDINGS_PAGE_SIZE)),
  );
  const requestedPage = Math.max(1, Math.floor(opts.page ?? 1));
  const categoryGroup = parseAwardCategoryGroup(opts.categoryGroup);

  const bundle = await fetchStandingsBundle(
    year,
    requestedPage,
    pageSize,
    categoryGroup,
    db,
  );

  const standings: StandingsPage = {
    year,
    listCount: bundle.listCount,
    detailedStatsRevealed: bundle.detailedStatsRevealed,
    standingsVersion: bundle.standingsVersion,
    scoresFresh: bundle.contribGeneration <= bundle.scoresGeneration,
    page: bundle.page,
    pageSize,
    gotyTotal: bundle.gotyTotal,
    totalPages: bundle.totalPages,
    goty: bundle.goty,
    categories: bundle.categories,
    categoryGroup: bundle.categoryGroup,
  };

  return redactStandingsPage(standings, { forceReveal: opts.forceReveal });
}
