import { and, eq, sql } from "drizzle-orm";
import {
  communityLiveLockSnapshots,
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
import { isCommunityLiveScoresRevealed } from "./live-reveal";
import { sliceLockGotyPage } from "./live-lock";

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

export type CommunityLiveLockPayload = {
  listCount: number;
  goty: StandingsGameRow[];
  categories: CategoryStandingsBlock[];
};

function parseLockPayload(raw: unknown): CommunityLiveLockPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const gotyRaw = Array.isArray(obj.goty) ? obj.goty : [];
  const categoriesRaw = Array.isArray(obj.categories) ? obj.categories : [];
  return {
    listCount: asInt(obj.listCount),
    goty: gotyRaw.map((row) => {
      const g = row as StandingsGameRow;
      return {
        place: asInt(g.place),
        gameId: String(g.gameId),
        slug: String(g.slug),
        title: String(g.title),
        year: g.year == null ? null : asInt(g.year),
        coverUrl: g.coverUrl ?? null,
        score: g.score == null ? null : asInt(g.score),
        listMentions: g.listMentions == null ? null : asInt(g.listMentions),
        rankCounts: null,
      };
    }),
    categories: categoriesRaw.map((block) => {
      const b = block as CategoryStandingsBlock;
      return {
        categoryId: String(b.categoryId),
        label: String(b.label),
        description: b.description ?? null,
        rows: (b.rows ?? []).map((row) => ({
          place: asInt(row.place),
          gameId: String(row.gameId),
          slug: String(row.slug),
          title: String(row.title),
          coverUrl: row.coverUrl ?? null,
          voteCount: row.voteCount == null ? null : asInt(row.voteCount),
        })),
      };
    }),
  };
}

function pageFromPayload(
  year: number,
  payload: CommunityLiveLockPayload,
  pageSize: number,
  requestedPage: number,
  revealed: boolean,
): StandingsPage {
  const paged = sliceLockGotyPage(payload.goty, pageSize, requestedPage);
  return redactStandingsPage({
    year,
    listCount: payload.listCount,
    detailedStatsRevealed: revealed,
    standingsVersion: 0,
    scoresFresh: true,
    page: paged.page,
    pageSize,
    gotyTotal: payload.goty.length,
    totalPages: paged.totalPages,
    goty: paged.rows,
    categories: payload.categories,
  });
}

/**
 * Live SUM board (unredacted). Never reads live_*_scores.
 */
async function queryCommunityLiveStandings(
  communityId: string,
  year: number,
  opts: { page: number; pageSize: number },
  db: Db,
): Promise<{
  listCount: number;
  gotyTotal: number;
  page: number;
  totalPages: number;
  goty: StandingsGameRow[];
  categories: CategoryStandingsBlock[];
}> {
  const { pageSize, page: requestedPage } = opts;

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

  const goty: StandingsGameRow[] = parseJsonArray<GotyJsonRow>(row.goty).map(
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

  return {
    listCount: asInt(row.list_count),
    gotyTotal,
    page,
    totalPages,
    goty,
    categories: [...byId.values()],
  };
}

async function buildLockPayload(
  communityId: string,
  year: number,
  db: Db,
): Promise<CommunityLiveLockPayload> {
  const live = await queryCommunityLiveStandings(
    communityId,
    year,
    { page: 1, pageSize: LOCK_SNAPSHOT_GOTY_CAP },
    db,
  );
  return {
    listCount: live.listCount,
    goty: live.goty,
    categories: live.categories,
  };
}

export async function clearCommunityLiveLockSnapshots(
  communityId: string,
  db: Db = getDb(),
): Promise<void> {
  await db
    .delete(communityLiveLockSnapshots)
    .where(eq(communityLiveLockSnapshots.communityId, communityId));
}

/** Freeze the current live SUM for a year (idempotent upsert). */
export async function upsertCommunityLiveLockSnapshot(
  communityId: string,
  year: number,
  db: Db = getDb(),
): Promise<CommunityLiveLockPayload> {
  const payload = await buildLockPayload(communityId, year, db);
  await db
    .insert(communityLiveLockSnapshots)
    .values({
      communityId,
      year,
      payload,
      lockedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [
        communityLiveLockSnapshots.communityId,
        communityLiveLockSnapshots.year,
      ],
      set: {
        payload,
        lockedAt: new Date(),
      },
    });
  return payload;
}

async function getOrCreateLockPayload(
  communityId: string,
  year: number,
  db: Db,
): Promise<CommunityLiveLockPayload> {
  const [existing] = await db
    .select({ payload: communityLiveLockSnapshots.payload })
    .from(communityLiveLockSnapshots)
    .where(
      and(
        eq(communityLiveLockSnapshots.communityId, communityId),
        eq(communityLiveLockSnapshots.year, year),
      ),
    )
    .limit(1);
  if (existing) {
    const parsed = parseLockPayload(existing.payload);
    if (parsed) return parsed;
  }
  return upsertCommunityLiveLockSnapshot(communityId, year, db);
}

/**
 * Live GOTY + category standings for one community year.
 * SUM(live_*_contrib) for current members — never reads live_*_scores.
 * When locked, serves a frozen snapshot (created lazily per year).
 */
export async function getCommunityLiveStandings(
  communityId: string,
  year: number,
  opts: {
    page?: number;
    pageSize?: number;
    scoresVisibleFrom?: Date | null;
    locked?: boolean;
  } = {},
  db: Db = getDb(),
): Promise<StandingsPage> {
  const pageSize = Math.min(
    200,
    Math.max(1, Math.floor(opts.pageSize ?? STANDINGS_PAGE_SIZE)),
  );
  const requestedPage = Math.max(1, Math.floor(opts.page ?? 1));
  const revealed = isCommunityLiveScoresRevealed(
    opts.scoresVisibleFrom ?? null,
  );

  if (opts.locked) {
    const payload = await getOrCreateLockPayload(communityId, year, db);
    return pageFromPayload(year, payload, pageSize, requestedPage, revealed);
  }

  const live = await queryCommunityLiveStandings(
    communityId,
    year,
    { page: requestedPage, pageSize },
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
  });
}
