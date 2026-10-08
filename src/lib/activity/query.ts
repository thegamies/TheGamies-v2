import {
  and,
  desc,
  eq,
  exists,
  gte,
  inArray,
  isNull,
  max,
  or,
  sql,
  type AnyColumn,
  type SQL,
} from "drizzle-orm";
import {
  activityEvents,
  communityMembers,
  covers,
  createDb,
  games,
  libraryEntries,
  lists,
  profileFollows,
  profiles,
  type Db,
} from "@thegamies/db";
import { coverUrlFromImageId } from "@thegamies/igdb";
import {
  ACTIVITY_KINDS,
  emptyLibraryStatusCounts,
  parseActivityKind,
  parseLibraryStatus,
  parseListRankVisibility,
  type LibraryStatus,
} from "@/lib/activity/kinds";
import {
  groupFeedEvents,
  type FeedCard,
  type FeedEventRow,
} from "@/lib/activity/group-feed";
import {
  countingKindsFromWeights,
  DEFAULT_PUBLIC_TRENDING_MIN_PEOPLE,
  DEFAULT_TRENDING_KIND_WEIGHTS,
  DEFAULT_TRENDING_RECENCY_WEIGHTS,
  isPublicTrendingReady,
  parsePublicTrendingMinPeople,
  parseTrendingKindWeights,
  parseTrendingRecencyWeights,
  parseTrendingWindowHours,
  type TrendingKindWeights,
  type TrendingRecencyWeights,
  type TrendingWindowHours,
} from "@/lib/activity/trending";
import { getSiteSettings } from "@/lib/site-settings/service";
import { paginateProfileItems } from "@/lib/profile/profile-page";

export const FEED_PAGE_SIZE = 40;
export const TRENDING_PAGE_SIZE = 48;
/** Bound events loaded for one page of person-day cards. */
const FEED_DAY_EVENT_CAP = FEED_PAGE_SIZE * 50;

function getDb(): Db {
  return createDb();
}

const utcFeedDay = sql`((${activityEvents.createdAt} at time zone 'utc')::date)`;

function feedPublicVisible() {
  return and(
    isNull(profiles.deletedAt),
    eq(profiles.visibility, "public"),
    sql`(
      (
        ${activityEvents.kind} in (
          'library_wishlist', 'library_backlog', 'library_playing',
          'library_paused', 'library_beat', 'library_dropped'
        )
        and ${activityEvents.gameId} is not null
        and ${libraryEntries.visibility} = 'public'
      )
      or (
        ${activityEvents.kind} in ('list_add', 'list_remove', 'list_reveal')
        and ${lists.rankVisibility} is distinct from 'hidden'
        and (
          ${activityEvents.kind} = 'list_reveal'
          or ${activityEvents.gameId} is not null
        )
      )
    )`,
  );
}

function feedEventJoins(db: Db) {
  return db
    .select({
      id: activityEvents.id,
      profileId: activityEvents.profileId,
      displayName: profiles.displayName,
      username: profiles.username,
      avatarUrl: profiles.avatarUrl,
      visibility: profiles.visibility,
      deletedAt: profiles.deletedAt,
      kind: activityEvents.kind,
      batchId: activityEvents.batchId,
      createdAt: activityEvents.createdAt,
      gameId: activityEvents.gameId,
      gameSlug: games.slug,
      gameTitle: games.title,
      coverImageId: covers.imageId,
      listId: activityEvents.listId,
      listSlug: lists.slug,
      listTitle: lists.title,
      listYear: lists.year,
      rankVisibility: lists.rankVisibility,
      libraryVisibility: libraryEntries.visibility,
    })
    .from(activityEvents)
    .innerJoin(profiles, eq(profiles.id, activityEvents.profileId))
    .leftJoin(games, eq(games.id, activityEvents.gameId))
    .leftJoin(covers, eq(covers.igdbId, games.coverIgdbId))
    .leftJoin(lists, eq(lists.id, activityEvents.listId))
    .leftJoin(
      libraryEntries,
      and(
        eq(libraryEntries.profileId, activityEvents.profileId),
        eq(libraryEntries.gameId, activityEvents.gameId),
      ),
    );
}

function toFeedEventRow(row: {
  id: string;
  profileId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  visibility: string | null;
  deletedAt: Date | null;
  kind: string;
  batchId: string;
  createdAt: Date;
  gameId: string | null;
  gameSlug: string | null;
  gameTitle: string | null;
  coverImageId: string | null;
  listId: string | null;
  listSlug: string | null;
  listTitle: string | null;
  listYear: number | null;
  rankVisibility: string | null;
  libraryVisibility: string | null;
}): FeedEventRow | null {
  if (row.deletedAt) return null;
  if (row.visibility !== "public") return null;
  const kind = parseActivityKind(row.kind);
  if (!kind) return null;
  if (kind.startsWith("library_")) {
    if (!row.gameId) return null;
    if (kind === "library_cleared") return null;
    if (row.libraryVisibility !== "public") return null;
  }
  if (kind === "list_add" || kind === "list_remove" || kind === "list_reveal") {
    if (parseListRankVisibility(row.rankVisibility) === "hidden") return null;
    if (kind !== "list_reveal" && !row.gameId) return null;
  }
  return {
    id: row.id,
    profileId: row.profileId,
    displayName: row.displayName,
    username: row.username,
    avatarUrl: row.avatarUrl,
    kind,
    batchId: row.batchId,
    createdAt: row.createdAt,
    gameId: row.gameId,
    gameSlug: row.gameSlug,
    gameTitle: row.gameTitle,
    coverUrl: coverUrlFromImageId(row.coverImageId),
    listId: row.listId,
    listSlug: row.listSlug,
    listTitle: row.listTitle,
    listYear: row.listYear,
  };
}

function feedDayText(day: unknown): string {
  if (typeof day === "string") return day.slice(0, 10);
  if (day instanceof Date && Number.isFinite(day.getTime())) {
    return day.toISOString().slice(0, 10);
  }
  return String(day).slice(0, 10);
}

/** Correlated follow check: no follow list is loaded or sent back as `IN (...)`. */
function followedBy(db: Db, followerProfileId: string, profileId: AnyColumn) {
  return exists(
    db
      .select({ one: sql`1` })
      .from(profileFollows)
      .where(
        and(
          eq(profileFollows.followerProfileId, followerProfileId),
          eq(profileFollows.followedProfileId, profileId),
        ),
      ),
  );
}

export async function listFollowingFeedPage(
  followerProfileId: string,
  pageRaw: number,
  db: Db = getDb(),
): Promise<{ cards: FeedCard[]; page: number; hasMore: boolean }> {
  const page = Math.max(1, Math.floor(pageRaw) || 1);
  const followed = followedBy(db, followerProfileId, activityEvents.profileId);

  const offset = (page - 1) * FEED_PAGE_SIZE;
  const dayRows = await db
    .select({
      profileId: activityEvents.profileId,
      day: sql<string>`(${utcFeedDay})::text`.as("feed_day"),
      latest: max(activityEvents.createdAt),
    })
    .from(activityEvents)
    .innerJoin(profiles, eq(profiles.id, activityEvents.profileId))
    .leftJoin(lists, eq(lists.id, activityEvents.listId))
    .leftJoin(
      libraryEntries,
      and(
        eq(libraryEntries.profileId, activityEvents.profileId),
        eq(libraryEntries.gameId, activityEvents.gameId),
      ),
    )
    .where(and(followed, feedPublicVisible()))
    .groupBy(activityEvents.profileId, utcFeedDay)
    .orderBy(desc(max(activityEvents.createdAt)), desc(activityEvents.profileId))
    .limit(FEED_PAGE_SIZE + 1)
    .offset(offset);

  const hasMore = dayRows.length > FEED_PAGE_SIZE;
  const pageDays = dayRows.slice(0, FEED_PAGE_SIZE);
  if (pageDays.length === 0) {
    return { cards: [], page, hasMore: false };
  }

  const dayMatch = or(
    ...pageDays.map((day) =>
      and(
        eq(activityEvents.profileId, day.profileId),
        sql`${utcFeedDay} = cast(${feedDayText(day.day)} as date)`,
      ),
    ),
  );

  const rows = await feedEventJoins(db)
    .where(
      and(followed, feedPublicVisible(), dayMatch),
    )
    .orderBy(desc(activityEvents.createdAt), desc(activityEvents.id))
    .limit(FEED_DAY_EVENT_CAP);

  const visible: FeedEventRow[] = [];
  for (const row of rows) {
    const mapped = toFeedEventRow(row);
    if (mapped) visible.push(mapped);
  }

  return {
    cards: groupFeedEvents(visible),
    page,
    hasMore,
  };
}

export type TrendingBoardRow = {
  gameId: string;
  slug: string;
  title: string;
  coverUrl: string | null;
};

/**
 * SQL mirror of `recencyWeightForAgeMs` over a `created_at` column. Timestamps
 * are UTC without zone; truncating to ms matches the JS Date the old path used.
 */
function trendingRecencyWeightSql(
  now: Date,
  raw: TrendingRecencyWeights,
): SQL {
  const weights = parseTrendingRecencyWeights(raw);
  const ageHours = sql`(extract(epoch FROM (
    (${now.toISOString()}::timestamptz AT TIME ZONE 'UTC') - date_trunc('milliseconds', created_at)
  )) / 3600)`;
  return sql`(CASE
    WHEN ${ageHours} <= 24 THEN ${weights.hours24}::float8
    WHEN ${ageHours} <= 72 THEN ${weights.days1to3}::float8
    WHEN ${ageHours} <= ${24 * 7} THEN ${weights.restOf7d}::float8
    ELSE ${weights.days7to30}::float8
  END)`;
}

/** SQL mirror of `kindWeightForTrending` over a `kind` column. */
function trendingKindWeightSql(raw: TrendingKindWeights): SQL {
  const weights = parseTrendingKindWeights(raw);
  const branches = ACTIVITY_KINDS.map(
    (kind) => sql`WHEN ${kind} THEN ${weights[kind]}::float8`,
  );
  return sql`(CASE kind ${sql.join(branches, sql` `)} ELSE 0::float8 END)`;
}

export async function listTrendingBoard(opts: {
  windowHours?: TrendingWindowHours;
  /** Restrict to people this profile follows. */
  followerProfileId?: string | null;
  communityId?: string | null;
  minPeople?: number;
  applySiteFloor?: boolean;
  recencyWeights?: TrendingRecencyWeights;
  kindWeights?: TrendingKindWeights;
  now?: Date;
  page?: number;
  db?: Db;
}): Promise<{
  rows: TrendingBoardRow[];
  windowHours: TrendingWindowHours;
  publicReady: boolean;
  distinctPeople: number;
  total: number;
  page: number;
  totalPages: number;
}> {
  const db = opts.db ?? getDb();
  const now = opts.now ?? new Date();
  const windowHours = parseTrendingWindowHours(opts.windowHours);
  const since = new Date(now.getTime() - windowHours * 60 * 60 * 1000);
  const minPeople = parsePublicTrendingMinPeople(
    opts.minPeople ?? DEFAULT_PUBLIC_TRENDING_MIN_PEOPLE,
  );
  let recencyWeights = opts.recencyWeights;
  let kindWeights = opts.kindWeights;
  if (!recencyWeights || !kindWeights) {
    const settings = await getSiteSettings(db).catch(() => null);
    recencyWeights =
      recencyWeights ??
      settings?.trendingRecencyWeights ??
      DEFAULT_TRENDING_RECENCY_WEIGHTS;
    kindWeights =
      kindWeights ??
      settings?.trendingKindWeights ??
      DEFAULT_TRENDING_KIND_WEIGHTS;
  }
  const countingKinds = countingKindsFromWeights(kindWeights);

  if (countingKinds.length === 0) {
    return {
      rows: [],
      windowHours,
      publicReady: !opts.applySiteFloor,
      distinctPeople: 0,
      total: 0,
      page: 1,
      totalPages: 1,
    };
  }

  const filters = [
    gte(activityEvents.createdAt, since),
    inArray(activityEvents.kind, countingKinds),
    eq(games.isAdult, false),
    eq(profiles.visibility, "public"),
    isNull(profiles.deletedAt),
    sql`(
      ${activityEvents.kind} not like 'library_%'
      or ${libraryEntries.visibility} = 'public'
    )`,
    sql`(
      ${activityEvents.kind} not like 'list_%'
      or ${lists.rankVisibility} is distinct from 'hidden'
    )`,
  ];

  if (opts.followerProfileId) {
    filters.push(followedBy(db, opts.followerProfileId, activityEvents.profileId));
  }

  const latestBase = db
    .selectDistinctOn([activityEvents.gameId, activityEvents.profileId], {
      gameId: activityEvents.gameId,
      profileId: activityEvents.profileId,
      kind: activityEvents.kind,
      createdAt: activityEvents.createdAt,
    })
    .from(activityEvents)
    .innerJoin(profiles, eq(profiles.id, activityEvents.profileId))
    .innerJoin(games, eq(games.id, activityEvents.gameId))
    .leftJoin(lists, eq(lists.id, activityEvents.listId))
    .leftJoin(
      libraryEntries,
      and(
        eq(libraryEntries.profileId, activityEvents.profileId),
        eq(libraryEntries.gameId, activityEvents.gameId),
      ),
    );
  // One row per (game, person): their most recent counting event in the window.
  const latest = (
    opts.communityId
      ? latestBase.innerJoin(
          communityMembers,
          and(
            eq(communityMembers.profileId, activityEvents.profileId),
            eq(communityMembers.communityId, opts.communityId),
          ),
        )
      : latestBase
  )
    .where(and(...filters))
    .orderBy(
      activityEvents.gameId,
      activityEvents.profileId,
      desc(activityEvents.createdAt),
      desc(activityEvents.id),
    );

  const requestedPage = Number.isFinite(opts.page)
    ? Math.floor(opts.page as number)
    : 1;
  const result = await db.execute(sql`
    WITH latest AS (${latest}),
    scored AS (
      SELECT
        game_id,
        count(*)::int AS people,
        sum(${trendingRecencyWeightSql(now, recencyWeights)} * ${trendingKindWeightSql(kindWeights)}) AS score
      FROM latest
      GROUP BY game_id
    ),
    paging AS (
      SELECT
        t.total,
        t.distinct_people,
        least(greatest(1, ceil(t.total / ${TRENDING_PAGE_SIZE}::numeric))::int, greatest(1, ${requestedPage}::int)) AS page
      FROM (
        SELECT
          (SELECT count(*) FROM scored)::int AS total,
          (SELECT count(DISTINCT profile_id) FROM latest)::int AS distinct_people
      ) t
    )
    SELECT paging.total, paging.distinct_people, paging.page,
      r.game_id, r.slug, r.title, r.cover_image_id
    FROM paging
    LEFT JOIN LATERAL (
      SELECT s.game_id, g.slug, g.title, c.image_id AS cover_image_id,
        row_number() OVER (ORDER BY s.score DESC, s.people DESC, s.game_id) AS position
      FROM scored s
      JOIN games g ON g.id = s.game_id
      LEFT JOIN covers c ON c.igdb_id = g.cover_igdb_id
      ORDER BY s.score DESC, s.people DESC, s.game_id
      LIMIT ${TRENDING_PAGE_SIZE}
      OFFSET (paging.page - 1) * ${TRENDING_PAGE_SIZE}
    ) r ON true
    ORDER BY r.position
  `);

  type TrendingPageRow = {
    total: number;
    distinct_people: number;
    page: number;
    game_id: string | null;
    slug: string | null;
    title: string | null;
    cover_image_id: string | null;
  };
  const pageRows = result.rows as TrendingPageRow[];
  const head = pageRows[0];
  const total = Number(head?.total ?? 0);
  const distinctPeople = Number(head?.distinct_people ?? 0);
  const publicReady = opts.applySiteFloor
    ? isPublicTrendingReady(distinctPeople, minPeople)
    : true;

  if (!publicReady) {
    return {
      rows: [],
      windowHours,
      publicReady: false,
      distinctPeople,
      total: 0,
      page: 1,
      totalPages: 1,
    };
  }

  const paging = paginateProfileItems(
    Number(head?.page ?? 1),
    total,
    TRENDING_PAGE_SIZE,
  );

  return {
    rows: pageRows
      .filter((row) => row.game_id)
      .map((row) => ({
        gameId: row.game_id as string,
        slug: row.slug ?? "",
        title: row.title ?? "",
        coverUrl: coverUrlFromImageId(row.cover_image_id),
      })),
    windowHours,
    publicReady: true,
    distinctPeople,
    total,
    page: paging.page,
    totalPages: paging.totalPages,
  };
}

export async function countFollowsLibraryForGame(
  gameId: string,
  followerProfileId: string,
  db: Db = getDb(),
): Promise<Record<LibraryStatus, number>> {
  const empty = emptyLibraryStatusCounts();
  const rows = await db
    .select({
      status: libraryEntries.status,
      n: sql<number>`count(*)::int`,
    })
    .from(libraryEntries)
    .innerJoin(profiles, eq(profiles.id, libraryEntries.profileId))
    .where(
      and(
        eq(libraryEntries.gameId, gameId),
        eq(libraryEntries.visibility, "public"),
        eq(profiles.visibility, "public"),
        isNull(profiles.deletedAt),
        followedBy(db, followerProfileId, libraryEntries.profileId),
      ),
    )
    .groupBy(libraryEntries.status);
  const counts = { ...empty };
  for (const row of rows) {
    const status = parseLibraryStatus(row.status);
    if (!status) continue;
    counts[status] = Number(row.n ?? 0);
  }
  return counts;
}
