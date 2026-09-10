import { and, desc, eq, gte, inArray, isNull, max, or, sql } from "drizzle-orm";
import {
  activityEvents,
  communityMembers,
  covers,
  createDb,
  games,
  libraryEntries,
  lists,
  profiles,
  type Db,
} from "@thegamies/db";
import { coverUrlFromImageId } from "@thegamies/igdb";
import {
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
  parseTrendingWindowHours,
  scoreTrending,
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

export async function listFollowingFeedPage(
  followedIds: string[],
  pageRaw: number,
  db: Db = getDb(),
): Promise<{ cards: FeedCard[]; page: number; hasMore: boolean }> {
  const page = Math.max(1, Math.floor(pageRaw) || 1);
  if (followedIds.length === 0) {
    return { cards: [], page, hasMore: false };
  }

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
    .where(and(inArray(activityEvents.profileId, followedIds), feedPublicVisible()))
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
      and(
        inArray(activityEvents.profileId, followedIds),
        feedPublicVisible(),
        dayMatch,
      ),
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

export async function listTrendingBoard(opts: {
  windowHours?: TrendingWindowHours;
  followedIds?: string[] | null;
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

  if (
    countingKinds.length === 0 ||
    (opts.followedIds && opts.followedIds.length === 0)
  ) {
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

  if (opts.followedIds) {
    filters.push(inArray(activityEvents.profileId, opts.followedIds));
  }

  const grouped = {
    gameId: activityEvents.gameId,
    profileId: activityEvents.profileId,
    lastAt: max(activityEvents.createdAt),
    kind: sql<string>`(array_agg(${activityEvents.kind} ORDER BY ${activityEvents.createdAt} DESC, ${activityEvents.id} DESC))[1]`,
    slug: games.slug,
    title: games.title,
    coverImageId: covers.imageId,
  };
  const groupBy = [
    activityEvents.gameId,
    activityEvents.profileId,
    games.slug,
    games.title,
    covers.imageId,
  ];

  const base = db
    .select(grouped)
    .from(activityEvents)
    .innerJoin(profiles, eq(profiles.id, activityEvents.profileId))
    .innerJoin(games, eq(games.id, activityEvents.gameId))
    .leftJoin(covers, eq(covers.igdbId, games.coverIgdbId))
    .leftJoin(lists, eq(lists.id, activityEvents.listId))
    .leftJoin(
      libraryEntries,
      and(
        eq(libraryEntries.profileId, activityEvents.profileId),
        eq(libraryEntries.gameId, activityEvents.gameId),
      ),
    );

  const raw = opts.communityId
    ? await base
        .innerJoin(
          communityMembers,
          and(
            eq(communityMembers.profileId, activityEvents.profileId),
            eq(communityMembers.communityId, opts.communityId),
          ),
        )
        .where(and(...filters))
        .groupBy(...groupBy)
    : await base.where(and(...filters)).groupBy(...groupBy);

  const meta = new Map<
    string,
    { slug: string; title: string; coverImageId: string | null }
  >();
  const allPeople = new Set<string>();
  const events: Array<{
    profileId: string;
    gameId: string;
    kind: string;
    createdAt?: Date;
  }> = [];
  for (const row of raw) {
    if (!row.gameId) continue;
    allPeople.add(row.profileId);
    events.push({
      profileId: row.profileId,
      gameId: row.gameId,
      kind: row.kind ?? "library_backlog",
      createdAt: row.lastAt ?? undefined,
    });
    if (!meta.has(row.gameId)) {
      meta.set(row.gameId, {
        slug: row.slug,
        title: row.title,
        coverImageId: row.coverImageId,
      });
    }
  }

  const ranked = scoreTrending(events, {
    now,
    weights: recencyWeights,
    kindWeights,
  });
  const distinctPeople = allPeople.size;
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

  const total = ranked.length;
  const paging = paginateProfileItems(
    opts.page ?? 1,
    total,
    TRENDING_PAGE_SIZE,
  );

  return {
    rows: ranked.slice(paging.offset, paging.offset + TRENDING_PAGE_SIZE).map((row) => {
      const info = meta.get(row.gameId)!;
      return {
        gameId: row.gameId,
        slug: info.slug,
        title: info.title,
        coverUrl: coverUrlFromImageId(info.coverImageId),
      };
    }),
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
  followedIds: string[],
  db: Db = getDb(),
): Promise<Record<LibraryStatus, number>> {
  const empty = emptyLibraryStatusCounts();
  if (followedIds.length === 0) return empty;
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
        inArray(libraryEntries.profileId, followedIds),
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
