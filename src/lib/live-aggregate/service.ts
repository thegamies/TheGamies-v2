import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { getPublicBoardMinLists, getSiteRankMode, getSiteSettings } from "@/lib/site-settings/service";
import { isPublicBoardReady } from "./public-board";
import { getYearMaxCategoryVotes } from "./category-highlights";
import {
  parseSharedRankMode,
  withDisplayRanks,
  withDisplayRanksOnPage,
  type SharedRankMode,
} from "@/lib/standings/shared-rank";
import {
  covers,
  games,
  liveGotyScores,
  liveGotyYearStats,
  type Db,
} from "@thegamies/db";
import { getLiveAggregateDb } from "./contrib";
import { ensureScoresFresh } from "./refresh";
import {
  CATEGORY_DETAIL_PAGE_SIZE,
  CATEGORY_LIST_TOP_RANKS,
  DEFAULT_LIVE_STANDINGS_VIEW,
  DEFAULT_STANDINGS_CATEGORY_GROUP,
  parseLiveStandingsView,
  parseStandingsCategoryGroup,
  type LiveStandingsViewId,
  type StandingsCategoryGroupFilter,
} from "./award-category-defs";

/** Top-N highlight depth for homepage / all-years standings strips. */
export const TOP_STANDINGS_RANK = 5;

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
  /** Sum of votes in the category; null when scores are hidden. */
  totalVotes: number | null;
  rows: CategoryStandingRow[];
};

export type StandingsPage = {
  year: number;
  listCount: number;
  detailedStatsRevealed: boolean;
  standingsVersion: number;
  scoresFresh: boolean;
  /** 1-based page of GOTY rows (or category detail rows). */
  page: number;
  pageSize: number;
  gotyTotal: number;
  totalPages: number;
  goty: StandingsGameRow[];
  categories: CategoryStandingsBlock[];
  categoryGroup: StandingsCategoryGroupFilter;
  /** Game of the Year grid vs Categories index vs one full category. */
  view: LiveStandingsViewId;
  /** Set when `view === "category"`. */
  categoryId: string | null;
  /** Games on the full category board (detail view). */
  categoryGameTotal: number;
  /** False until the year has enough GOTY lists. */
  gotyPublic: boolean;
  /** False until the year has enough category votes. */
  categoriesPublic: boolean;
};

/** Keep rows whose displayed rank is within the top N places (ties included). */
export function takeTopDisplayRanks<T extends { place: number }>(
  rows: T[],
  maxRank: number,
): T[] {
  const cap = Math.max(1, Math.floor(maxRank));
  return rows.filter((row) => row.place <= cap);
}

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
      // Category totals stay public (list-count style meta). Per-game
      // vote counts on rows stay hidden until reveal.
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
  totalVotes: number;
  place: number | null;
  gameId: string | null;
  slug: string | null;
  title: string | null;
  coverImageId: string | null;
  voteCount: number | null;
  categoryGameTotal?: number;
};

/**
 * One Neon round-trip for the public GOTY rankings board:
 * year stats + total + (GOTY page and/or category tallies by view).
 * Categories index: ordered by total votes; games trimmed to top ranks.
 * Category detail: one award, paginated game rows.
 */
async function fetchStandingsBundle(
  year: number,
  requestedPage: number,
  pageSize: number,
  categoryGroup: StandingsCategoryGroupFilter,
  view: LiveStandingsViewId,
  categoryId: string | null,
  rankMode: SharedRankMode,
  minCategoryVotes: number,
  db: Db,
): Promise<
  Omit<
    StandingsPage,
    | "year"
    | "pageSize"
    | "scoresFresh"
    | "view"
    | "categoryId"
    | "gotyPublic"
    | "categoriesPublic"
  > & {
    contribGeneration: number;
    scoresGeneration: number;
  }
> {
  const includeGoty = view === "goty";
  const includeCategoryIndex = view === "categories";
  const includeCategoryDetail = view === "category" && Boolean(categoryId);
  const includeCategories = includeCategoryIndex || includeCategoryDetail;
  const categoryGameLimit = includeCategoryDetail
    ? pageSize
    : Math.max(12, CATEGORY_LIST_TOP_RANKS * 4);
  const categoryOffset = includeCategoryDetail
    ? (Math.max(1, requestedPage) - 1) * pageSize
    : 0;
  const groupFilter =
    categoryGroup === "all"
      ? sql``
      : sql`and ac.category_group = ${categoryGroup}`;
  const categoryIdFilter =
    includeCategoryDetail && categoryId
      ? sql`and ac.id = ${categoryId}`
      : sql``;
  const higherCountSelect =
    rankMode === "dense"
      ? sql`count(distinct hs.score)::int`
      : sql`count(*)::int`;

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
      case
        when ${includeGoty} then (
          select ${higherCountSelect}
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
        )
        else 0
      end as higher_count,
      case
        when ${includeGoty} then coalesce(
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
        )
        else '[]'::json
      end as goty,
      case
        when ${includeCategories} then coalesce(
          (
            select json_agg(
              row_to_json(cat)
              order by cat."totalVotes" desc, cat."label", cat."place" nulls last
            )
            from (
              select
                ac.id as "categoryId",
                ac.label as "label",
                ac.description as "description",
                ac.sort_order as "sortOrder",
                coalesce(
                  (
                    select sum(s.vote_count)::int
                    from live_category_scores s
                    where s.year = ${year}
                      and s.category_id = ac.id
                  ),
                  0
                ) as "totalVotes",
                coalesce(
                  (
                    select count(*)::int
                    from live_category_scores s
                    where s.year = ${year}
                      and s.category_id = ac.id
                  ),
                  0
                ) as "categoryGameTotal",
                r.place as "place",
                r.game_id as "gameId",
                r.slug as "slug",
                r.title as "title",
                r.cover_image_id as "coverImageId",
                r.vote_count as "voteCount"
              from award_categories ac
              left join lateral (
                select
                  (${categoryOffset} + row_number() over (
                    order by s.vote_count desc, s.game_id asc
                  ))::int as place,
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
                limit ${categoryGameLimit}
                offset ${categoryOffset}
              ) r on true
              where ac.active = true
                ${groupFilter}
                ${categoryIdFilter}
                and exists (
                  select 1
                  from live_category_scores s
                  where s.year = ${year}
                    and s.category_id = ac.id
                  having sum(s.vote_count) >= ${minCategoryVotes}
                )
            ) cat
          ),
          '[]'::json
        )
        else '[]'::json
      end as categories
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
      categoryGameTotal: 0,
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
      mode: rankMode,
    },
  ).map((r) => ({ ...r, place: r.rank }));

  const categoryRows = parseJsonArray<CategoryJsonRow>(row.categories);
  const byId = new Map<string, CategoryStandingsBlock & { categoryGameTotal: number }>();
  for (const cat of categoryRows) {
    let block = byId.get(cat.categoryId);
    if (!block) {
      block = {
        categoryId: cat.categoryId,
        label: cat.label,
        description: cat.description,
        totalVotes: asInt(cat.totalVotes),
        categoryGameTotal: asInt(cat.categoryGameTotal),
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

  let categoryGameTotal = 0;
  const categories: CategoryStandingsBlock[] = [];
  for (const block of byId.values()) {
    const ranked = withDisplayRanks(
      block.rows,
      (r) => r.voteCount ?? 0,
      rankMode,
    ).map((r) => ({ ...r, place: r.rank }));
    categoryGameTotal = Math.max(categoryGameTotal, block.categoryGameTotal);
    categories.push({
      categoryId: block.categoryId,
      label: block.label,
      description: block.description,
      totalVotes: block.totalVotes,
      rows: includeCategoryDetail
        ? ranked
        : takeTopDisplayRanks(ranked, CATEGORY_LIST_TOP_RANKS),
    });
  }

  const detailTotalPages = includeCategoryDetail
    ? Math.max(1, Math.ceil(categoryGameTotal / pageSize) || 1)
    : asInt(row.total_pages, 1);
  const detailPage = includeCategoryDetail
    ? clampStandingsPage(requestedPage, detailTotalPages)
    : page;

  return {
    listCount: asInt(row.list_count),
    detailedStatsRevealed: asBool(row.detailed_stats_revealed),
    standingsVersion: asInt(row.standings_version),
    contribGeneration: asInt(row.contrib_generation),
    scoresGeneration: asInt(row.scores_generation),
    page: detailPage,
    gotyTotal: asInt(row.goty_total),
    totalPages: detailTotalPages,
    goty,
    categories,
    categoryGroup,
    categoryGameTotal: includeCategoryDetail ? categoryGameTotal : 0,
  };
}

export async function getStandingsPage(
  year: number,
  opts: {
    ensureFresh?: boolean;
    forceReveal?: boolean;
    page?: number;
    pageSize?: number;
    categoryGroup?: StandingsCategoryGroupFilter;
    view?: LiveStandingsViewId;
    categoryId?: string | null;
    /** Override site setting (tests). */
    rankMode?: SharedRankMode;
  } = {},
  db: Db = getLiveAggregateDb(),
): Promise<StandingsPage> {
  // Opt-in only: standings reads skip lazy refresh by default (Neon HTTP
  // round-trips). Saves already schedule tryRefreshYear via after().
  if (opts.ensureFresh === true) {
    await ensureScoresFresh(year, db);
  }

  const view = parseLiveStandingsView(opts.view ?? DEFAULT_LIVE_STANDINGS_VIEW);
  const categoryId =
    view === "category" && opts.categoryId ? String(opts.categoryId) : null;
  const defaultPageSize =
    view === "category" ? CATEGORY_DETAIL_PAGE_SIZE : STANDINGS_PAGE_SIZE;
  const pageSize = Math.min(
    200,
    Math.max(1, Math.floor(opts.pageSize ?? defaultPageSize)),
  );
  const requestedPage = Math.max(1, Math.floor(opts.page ?? 1));
  const categoryGroup = parseStandingsCategoryGroup(
    opts.categoryGroup ?? DEFAULT_STANDINGS_CATEGORY_GROUP,
  );
  const settings = await getSiteSettings(db);
  const rankMode = opts.rankMode ?? parseSharedRankMode(settings.rankMode);
  const minLists = settings.publicBoardMinLists;
  const minCategoryVotes = settings.publicBoardMinCategoryVotes;

  const bundle = await fetchStandingsBundle(
    year,
    requestedPage,
    pageSize,
    categoryGroup,
    view,
    categoryId,
    rankMode,
    minCategoryVotes,
    db,
  );

  const categoryVotes = await getYearMaxCategoryVotes(year, db);
  const gotyPublic = isPublicBoardReady(bundle.listCount, minLists);
  const categoriesPublic = isPublicBoardReady(categoryVotes, minCategoryVotes);

  const standings: StandingsPage = {
    year,
    listCount: bundle.listCount,
    detailedStatsRevealed: bundle.detailedStatsRevealed,
    standingsVersion: bundle.standingsVersion,
    scoresFresh: bundle.contribGeneration <= bundle.scoresGeneration,
    page: gotyPublic ? bundle.page : 1,
    pageSize,
    gotyTotal: gotyPublic ? bundle.gotyTotal : 0,
    totalPages: gotyPublic ? bundle.totalPages : 1,
    goty: gotyPublic ? bundle.goty : [],
    categories: categoriesPublic ? bundle.categories : [],
    categoryGroup: bundle.categoryGroup,
    view,
    categoryId,
    categoryGameTotal: categoriesPublic ? bundle.categoryGameTotal : 0,
    gotyPublic,
    categoriesPublic,
  };

  return redactStandingsPage(standings, { forceReveal: opts.forceReveal });
}

/**
 * Every site GOTY score row whose displayed rank is ≤ maxRank (default 5),
 * including the full tie at the cutoff. Not a board-order LIMIT.
 */
export async function getGotyThroughRank(
  year: number,
  opts: {
    maxRank?: number;
    forceReveal?: boolean;
    /** Override site setting (tests). */
    rankMode?: SharedRankMode;
  } = {},
  db: Db = getLiveAggregateDb(),
): Promise<{
  year: number;
  detailedStatsRevealed: boolean;
  listCount: number;
  rows: StandingsGameRow[];
}> {
  const maxRank = Math.max(
    1,
    Math.floor(opts.maxRank ?? TOP_STANDINGS_RANK),
  );
  const rankMode =
    opts.rankMode ?? parseSharedRankMode(await getSiteRankMode(db));
  const stats = await getYearStats(year, db);

  let cutoffScore: number | undefined;
  if (rankMode === "dense") {
    const distinct = await db
      .select({ score: liveGotyScores.score })
      .from(liveGotyScores)
      .where(eq(liveGotyScores.year, year))
      .groupBy(liveGotyScores.score)
      .orderBy(desc(liveGotyScores.score))
      .limit(maxRank);
    cutoffScore = distinct[distinct.length - 1]?.score;
  } else {
    const [nth] = await db
      .select({ score: liveGotyScores.score })
      .from(liveGotyScores)
      .where(eq(liveGotyScores.year, year))
      .orderBy(desc(liveGotyScores.score), asc(liveGotyScores.gameId))
      .limit(1)
      .offset(maxRank - 1);
    cutoffScore = nth?.score;
  }

  const scoreRows =
    cutoffScore == null
      ? await db
          .select({
            gameId: liveGotyScores.gameId,
            slug: games.slug,
            title: games.title,
            gameYear: games.year,
            coverImageId: covers.imageId,
            score: liveGotyScores.score,
            listMentions: liveGotyScores.listMentions,
          })
          .from(liveGotyScores)
          .innerJoin(games, eq(games.id, liveGotyScores.gameId))
          .leftJoin(covers, eq(covers.igdbId, games.coverIgdbId))
          .where(eq(liveGotyScores.year, year))
          .orderBy(desc(liveGotyScores.score), asc(liveGotyScores.gameId))
      : await db
          .select({
            gameId: liveGotyScores.gameId,
            slug: games.slug,
            title: games.title,
            gameYear: games.year,
            coverImageId: covers.imageId,
            score: liveGotyScores.score,
            listMentions: liveGotyScores.listMentions,
          })
          .from(liveGotyScores)
          .innerJoin(games, eq(games.id, liveGotyScores.gameId))
          .leftJoin(covers, eq(covers.igdbId, games.coverIgdbId))
          .where(
            and(
              eq(liveGotyScores.year, year),
              gte(liveGotyScores.score, cutoffScore),
            ),
          )
          .orderBy(desc(liveGotyScores.score), asc(liveGotyScores.gameId));

  const ranked = withDisplayRanks(
    scoreRows.map((r) => ({
      place: 0,
      gameId: r.gameId,
      slug: r.slug,
      title: r.title,
      year: r.gameYear,
      coverUrl: coverUrlFrom(r.coverImageId),
      score: r.score,
      listMentions: r.listMentions,
      rankCounts: null as number[] | null,
    })),
    (r) => r.score ?? 0,
    rankMode,
  )
    .filter((r) => r.rank <= maxRank)
    .map((r) => ({ ...r, place: r.rank }));

  const reveal = opts.forceReveal === true || stats.detailedStatsRevealed;
  return {
    year,
    detailedStatsRevealed: stats.detailedStatsRevealed,
    listCount: stats.listCount,
    rows: reveal
      ? ranked
      : ranked.map((row) => ({
          ...row,
          score: null,
          listMentions: null,
          rankCounts: null,
        })),
  };
}

/** Years that have live GOTY score rows and enough lists to publish, newest first. */
export async function listYearsWithGotyScores(
  db: Db = getLiveAggregateDb(),
): Promise<number[]> {
  const minLists = await getPublicBoardMinLists(db);
  const rows = await db
    .selectDistinct({ year: liveGotyScores.year })
    .from(liveGotyScores)
    .innerJoin(
      liveGotyYearStats,
      eq(liveGotyYearStats.year, liveGotyScores.year),
    )
    .where(gte(liveGotyYearStats.listCount, minLists))
    .orderBy(desc(liveGotyScores.year));
  return rows.map((r) => r.year);
}

export async function getGotyThroughRankForYears(
  years: readonly number[],
  opts: {
    maxRank?: number;
    forceReveal?: boolean;
    rankMode?: SharedRankMode;
  } = {},
  db: Db = getLiveAggregateDb(),
): Promise<
  Array<{
    year: number;
    detailedStatsRevealed: boolean;
    listCount: number;
    rows: StandingsGameRow[];
  }>
> {
  const unique = [...new Set(years.map((y) => Math.floor(y)))].filter((y) =>
    Number.isFinite(y),
  );
  const rankMode =
    opts.rankMode ?? parseSharedRankMode(await getSiteRankMode(db));
  return Promise.all(
    unique.map((year) =>
      getGotyThroughRank(year, { ...opts, rankMode }, db),
    ),
  );
}

/** Keep configured years that already meet the public GOTY list floor, original order. */
export async function filterYearsWithPublicGoty(
  years: readonly number[],
  db: Db = getLiveAggregateDb(),
): Promise<number[]> {
  const unique = [...new Set(years.map((y) => Math.floor(y)))].filter((y) =>
    Number.isFinite(y),
  );
  if (unique.length === 0) return [];

  const minLists = await getPublicBoardMinLists(db);
  const rows = await db
    .select({ year: liveGotyYearStats.year })
    .from(liveGotyYearStats)
    .where(
      and(
        inArray(liveGotyYearStats.year, unique),
        gte(liveGotyYearStats.listCount, minLists),
      ),
    );
  const allowed = new Set(rows.map((r) => r.year));
  return unique.filter((year) => allowed.has(year));
}
