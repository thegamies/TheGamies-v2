import { and, asc, eq, gt, sql } from "drizzle-orm";
import {
  awardCategories,
  communityLiveLockCategoryRows,
  communityLiveLockGoty,
  communityLiveLockMeta,
  createDb,
  type Db,
} from "@thegamies/db";
import {
  STANDINGS_PAGE_SIZE,
  clampStandingsPage,
  redactStandingsPage,
  type CategoryStandingsBlock,
  type StandingsGameRow,
  type StandingsPage,
} from "@/lib/live-aggregate/service";
import {
  parseAwardCategoryGroup,
  type AwardCategoryGroup,
} from "@/lib/live-aggregate/award-category-defs";
import { isCommunityLiveScoresRevealed } from "./live-reveal";
import {
  withDisplayRanks,
  withDisplayRanksOnPage,
} from "@/lib/standings/shared-rank";

/** Max GOTY rows frozen into a lock snapshot. */
const LOCK_SNAPSHOT_GOTY_CAP = 2000;

function getDb(): Db {
  return createDb();
}

function coverUrlFrom(imageId: string | null | undefined): string | null {
  if (!imageId) return null;
  return `https://images.igdb.com/igdb/image/upload/t_cover_big/${imageId}.jpg`;
}

function asInt(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
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

type BundleRow = {
  list_count: unknown;
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

function groupCategoryBlocks(
  rows: Array<{
    categoryId: string;
    label: string;
    description: string | null;
    sortOrder: number;
    place: number;
    gameId: string;
    slug: string;
    title: string;
    coverUrl: string | null;
    voteCount: number;
  }>,
): CategoryStandingsBlock[] {
  type Acc = CategoryStandingsBlock & { sortOrder: number };
  const byId = new Map<string, Acc>();
  for (const row of rows) {
    let block = byId.get(row.categoryId);
    if (!block) {
      block = {
        categoryId: row.categoryId,
        label: row.label,
        description: row.description,
        sortOrder: row.sortOrder,
        rows: [],
      };
      byId.set(row.categoryId, block);
    }
    block.rows.push({
      place: row.place,
      gameId: row.gameId,
      slug: row.slug,
      title: row.title,
      coverUrl: row.coverUrl,
      voteCount: row.voteCount,
    });
  }
  return [...byId.values()]
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label))
    .map((block) => ({
      categoryId: block.categoryId,
      label: block.label,
      description: block.description,
      rows: withDisplayRanks(
        block.rows,
        (r) => r.voteCount ?? 0,
        "competition",
      ).map((r) => ({ ...r, place: r.rank })),
    }));
}

/**
 * Live SUM board (unredacted). Never reads live_*_scores.
 */
async function queryCommunityLiveStandings(
  communityId: string,
  year: number,
  opts: { page: number; pageSize: number; categoryGroup?: AwardCategoryGroup },
  db: Db,
): Promise<{
  listCount: number;
  gotyTotal: number;
  page: number;
  totalPages: number;
  goty: StandingsGameRow[];
  categories: CategoryStandingsBlock[];
}> {
  const { pageSize, page: requestedPage, categoryGroup } = opts;

  const result = await db.execute(sql`
    with bounds as (
      select
        (
          select count(distinct c.list_id)::int
          from live_goty_contrib c
          inner join community_members m
            on m.profile_id = c.profile_id
           and m.community_id = ${communityId}::uuid
          where c.year = ${year}
        ) as list_count,
        (
          select count(*)::int
          from (
            select c.game_id
            from live_goty_contrib c
            inner join community_members m
              on m.profile_id = c.profile_id
             and m.community_id = ${communityId}::uuid
            where c.year = ${year}
            group by c.game_id
          ) g
        ) as goty_total
    ),
    paged as (
      select
        b.*,
        greatest(
          1,
          ceil(b.goty_total::numeric / ${pageSize}::numeric)
        )::int as total_pages,
        least(
          greatest(${requestedPage}::int, 1),
          greatest(
            1,
            ceil(b.goty_total::numeric / ${pageSize}::numeric)
          )::int
        ) as page
      from bounds b
    )
    select
      p.list_count,
      p.goty_total,
      p.page,
      p.total_pages,
      (
        select count(*)::int
        from (
          select sum(c.points)::int as score
          from live_goty_contrib c
          inner join community_members m
            on m.profile_id = c.profile_id
           and m.community_id = ${communityId}::uuid
          where c.year = ${year}
          group by c.game_id
        ) totals
        where totals.score > (
          select agg.score
          from (
            select sum(c.points)::int as score
            from live_goty_contrib c
            inner join community_members m
              on m.profile_id = c.profile_id
             and m.community_id = ${communityId}::uuid
            where c.year = ${year}
            group by c.game_id
            order by sum(c.points) desc, c.game_id asc
            offset (p.page - 1) * ${pageSize}
            limit 1
          ) agg
        )
      ) as higher_count,
      coalesce(
        (
          select json_agg(row_to_json(row) order by row."place")
          from (
            select
              ((p.page - 1) * ${pageSize} + row_number() over (
                order by agg.score desc, agg.game_id asc
              ))::int as "place",
              agg.game_id as "gameId",
              g.slug as "slug",
              g.title as "title",
              g.year as "year",
              cov.image_id as "coverImageId",
              agg.score as "score",
              agg.list_mentions as "listMentions"
            from (
              select
                c.game_id,
                sum(c.points)::int as score,
                count(*)::int as list_mentions
              from live_goty_contrib c
              inner join community_members m
                on m.profile_id = c.profile_id
               and m.community_id = ${communityId}::uuid
              where c.year = ${year}
              group by c.game_id
              order by sum(c.points) desc, c.game_id asc
              limit ${pageSize}
              offset (p.page - 1) * ${pageSize}
            ) agg
            inner join games g on g.id = agg.game_id
            left join covers cov on cov.igdb_id = g.cover_igdb_id
          ) row
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
                  order by tallies.vote_count desc, tallies.game_id asc
                )::int as place,
                tallies.game_id,
                g.slug,
                g.title,
                cov.image_id as cover_image_id,
                tallies.vote_count
              from (
                select
                  c.game_id,
                  count(*)::int as vote_count
                from live_category_contrib c
                inner join community_members m
                  on m.profile_id = c.profile_id
                 and m.community_id = ${communityId}::uuid
                where c.year = ${year}
                  and c.category_id = ac.id
                group by c.game_id
              ) tallies
              inner join games g on g.id = tallies.game_id
              left join covers cov on cov.igdb_id = g.cover_igdb_id
              order by tallies.vote_count desc, tallies.game_id asc
              limit 10
            ) r on true
            where ac.active = true
              ${
                categoryGroup
                  ? sql`and ac.category_group = ${categoryGroup}`
                  : sql``
              }
          ) cat
        ),
        '[]'::json
      ) as categories
    from paged p
  `);

  const row = result.rows[0] as BundleRow | undefined;
  if (!row) {
    return {
      listCount: 0,
      gotyTotal: 0,
      page: 1,
      totalPages: 1,
      goty: [],
      categories: [],
    };
  }

  const gotyTotal = asInt(row.goty_total);
  const totalPages = Math.max(1, asInt(row.total_pages, 1));
  const page = clampStandingsPage(asInt(row.page, 1), totalPages);

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
      rankCounts: null,
    }),
  );
  const goty = withDisplayRanksOnPage(gotyRaw, (r) => r.score ?? 0, {
    offset: (page - 1) * pageSize,
    firstGroupRank: asInt(row.higher_count) + 1,
    mode: "competition",
  }).map((r) => ({ ...r, place: r.rank }));

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
    gotyTotal,
    page,
    totalPages,
    goty,
    categories: [...byId.values()],
  };
}

async function clearLockYear(
  communityId: string,
  year: number,
  db: Db,
): Promise<void> {
  await db
    .delete(communityLiveLockGoty)
    .where(
      and(
        eq(communityLiveLockGoty.communityId, communityId),
        eq(communityLiveLockGoty.year, year),
      ),
    );
  await db
    .delete(communityLiveLockCategoryRows)
    .where(
      and(
        eq(communityLiveLockCategoryRows.communityId, communityId),
        eq(communityLiveLockCategoryRows.year, year),
      ),
    );
  await db
    .delete(communityLiveLockMeta)
    .where(
      and(
        eq(communityLiveLockMeta.communityId, communityId),
        eq(communityLiveLockMeta.year, year),
      ),
    );
}

export async function clearCommunityLiveLockSnapshots(
  communityId: string,
  db: Db = getDb(),
): Promise<void> {
  await db
    .delete(communityLiveLockGoty)
    .where(eq(communityLiveLockGoty.communityId, communityId));
  await db
    .delete(communityLiveLockCategoryRows)
    .where(eq(communityLiveLockCategoryRows.communityId, communityId));
  await db
    .delete(communityLiveLockMeta)
    .where(eq(communityLiveLockMeta.communityId, communityId));
}

/** Freeze the current live SUM for a year (replace rows; SQL-paginated reads). */
export async function upsertCommunityLiveLockSnapshot(
  communityId: string,
  year: number,
  db: Db = getDb(),
): Promise<{ listCount: number; gotyTotal: number }> {
  const live = await queryCommunityLiveStandings(
    communityId,
    year,
    { page: 1, pageSize: LOCK_SNAPSHOT_GOTY_CAP },
    db,
  );

  await clearLockYear(communityId, year, db);

  const now = new Date();
  await db.insert(communityLiveLockMeta).values({
    communityId,
    year,
    listCount: live.listCount,
    gotyTotal: live.goty.length,
    lockedAt: now,
  });

  if (live.goty.length > 0) {
    await db.insert(communityLiveLockGoty).values(
      live.goty.map((row) => ({
        communityId,
        year,
        place: row.place,
        gameId: row.gameId,
        slug: row.slug,
        title: row.title,
        gameYear: row.year,
        coverUrl: row.coverUrl,
        score: row.score ?? 0,
        listMentions: row.listMentions ?? 0,
      })),
    );
  }

  const categoryInserts: Array<{
    communityId: string;
    year: number;
    categoryId: string;
    label: string;
    description: string | null;
    sortOrder: number;
    place: number;
    gameId: string;
    slug: string;
    title: string;
    coverUrl: string | null;
    voteCount: number;
  }> = [];
  live.categories.forEach((block, sortOrder) => {
    for (const row of block.rows) {
      categoryInserts.push({
        communityId,
        year,
        categoryId: block.categoryId,
        label: block.label,
        description: block.description,
        sortOrder,
        place: row.place,
        gameId: row.gameId,
        slug: row.slug,
        title: row.title,
        coverUrl: row.coverUrl,
        voteCount: row.voteCount ?? 0,
      });
    }
  });
  if (categoryInserts.length > 0) {
    await db.insert(communityLiveLockCategoryRows).values(categoryInserts);
  }

  return { listCount: live.listCount, gotyTotal: live.goty.length };
}

async function ensureLockYear(
  communityId: string,
  year: number,
  db: Db,
): Promise<{ listCount: number; gotyTotal: number }> {
  const [existing] = await db
    .select({
      listCount: communityLiveLockMeta.listCount,
      gotyTotal: communityLiveLockMeta.gotyTotal,
    })
    .from(communityLiveLockMeta)
    .where(
      and(
        eq(communityLiveLockMeta.communityId, communityId),
        eq(communityLiveLockMeta.year, year),
      ),
    )
    .limit(1);
  if (existing) {
    return {
      listCount: existing.listCount,
      gotyTotal: existing.gotyTotal,
    };
  }
  return upsertCommunityLiveLockSnapshot(communityId, year, db);
}

async function queryLockedStandingsPage(
  communityId: string,
  year: number,
  pageSize: number,
  requestedPage: number,
  categoryGroup: AwardCategoryGroup,
  db: Db,
): Promise<{
  listCount: number;
  gotyTotal: number;
  page: number;
  totalPages: number;
  goty: StandingsGameRow[];
  categories: CategoryStandingsBlock[];
}> {
  const meta = await ensureLockYear(communityId, year, db);
  const totalPages = Math.max(1, Math.ceil(meta.gotyTotal / pageSize) || 1);
  const page = clampStandingsPage(requestedPage, totalPages);
  const offset = (page - 1) * pageSize;

  const gotyRows = await db
    .select()
    .from(communityLiveLockGoty)
    .where(
      and(
        eq(communityLiveLockGoty.communityId, communityId),
        eq(communityLiveLockGoty.year, year),
      ),
    )
    .orderBy(asc(communityLiveLockGoty.place))
    .limit(pageSize)
    .offset(offset);

  const categoryRows = await db
    .select({
      categoryId: communityLiveLockCategoryRows.categoryId,
      label: communityLiveLockCategoryRows.label,
      description: communityLiveLockCategoryRows.description,
      sortOrder: communityLiveLockCategoryRows.sortOrder,
      place: communityLiveLockCategoryRows.place,
      gameId: communityLiveLockCategoryRows.gameId,
      slug: communityLiveLockCategoryRows.slug,
      title: communityLiveLockCategoryRows.title,
      coverUrl: communityLiveLockCategoryRows.coverUrl,
      voteCount: communityLiveLockCategoryRows.voteCount,
    })
    .from(communityLiveLockCategoryRows)
    .innerJoin(
      awardCategories,
      eq(awardCategories.id, communityLiveLockCategoryRows.categoryId),
    )
    .where(
      and(
        eq(communityLiveLockCategoryRows.communityId, communityId),
        eq(communityLiveLockCategoryRows.year, year),
        eq(awardCategories.categoryGroup, categoryGroup),
      ),
    )
    .orderBy(
      asc(communityLiveLockCategoryRows.sortOrder),
      asc(communityLiveLockCategoryRows.place),
    );

  const gotyMapped = gotyRows.map((row) => ({
    place: row.place,
    gameId: row.gameId,
    slug: row.slug,
    title: row.title,
    year: row.gameYear,
    coverUrl: row.coverUrl,
    score: row.score,
    listMentions: row.listMentions,
    rankCounts: null,
  }));
  let firstGroupRank = 1;
  if (gotyMapped[0]) {
    const [higher] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(communityLiveLockGoty)
      .where(
        and(
          eq(communityLiveLockGoty.communityId, communityId),
          eq(communityLiveLockGoty.year, year),
          gt(communityLiveLockGoty.score, gotyMapped[0].score),
        ),
      );
    firstGroupRank = Number(higher?.n ?? 0) + 1;
  }
  const goty = withDisplayRanksOnPage(gotyMapped, (r) => r.score ?? 0, {
    offset: gotyMapped[0] ? gotyMapped[0].place - 1 : 0,
    firstGroupRank,
    mode: "competition",
  }).map((r) => ({ ...r, place: r.rank }));

  return {
    listCount: meta.listCount,
    gotyTotal: meta.gotyTotal,
    page,
    totalPages,
    goty,
    categories: groupCategoryBlocks(categoryRows),
  };
}

/**
 * Live GOTY + category standings for one community year.
 * SUM(live_*_contrib) for current members — never reads live_*_scores.
 * When locked, serves frozen rows (created lazily per year) with SQL pagination.
 */
export async function getCommunityLiveStandings(
  communityId: string,
  year: number,
  opts: {
    page?: number;
    pageSize?: number;
    scoresVisibleFrom?: Date | null;
    locked?: boolean;
    categoryGroup?: AwardCategoryGroup;
  } = {},
  db: Db = getDb(),
): Promise<StandingsPage> {
  const pageSize = Math.min(
    200,
    Math.max(1, Math.floor(opts.pageSize ?? STANDINGS_PAGE_SIZE)),
  );
  const requestedPage = Math.max(1, Math.floor(opts.page ?? 1));
  const categoryGroup = parseAwardCategoryGroup(opts.categoryGroup);
  const revealed = isCommunityLiveScoresRevealed(
    opts.scoresVisibleFrom ?? null,
  );

  if (opts.locked) {
    const locked = await queryLockedStandingsPage(
      communityId,
      year,
      pageSize,
      requestedPage,
      categoryGroup,
      db,
    );
    return redactStandingsPage({
      year,
      listCount: locked.listCount,
      detailedStatsRevealed: revealed,
      standingsVersion: 0,
      scoresFresh: true,
      page: locked.page,
      pageSize,
      gotyTotal: locked.gotyTotal,
      totalPages: locked.totalPages,
      goty: locked.goty,
      categories: locked.categories,
      categoryGroup,
    });
  }

  const live = await queryCommunityLiveStandings(
    communityId,
    year,
    { page: requestedPage, pageSize, categoryGroup },
    db,
  );

  return redactStandingsPage({
    year,
    listCount: live.listCount,
    detailedStatsRevealed: revealed,
    standingsVersion: 0,
    scoresFresh: true,
    page: live.page,
    pageSize,
    gotyTotal: live.gotyTotal,
    totalPages: live.totalPages,
    goty: live.goty,
    categories: live.categories,
    categoryGroup,
  });
}
