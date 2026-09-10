import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import {
  activityEvents,
  createDb,
  games,
  libraryEntries,
  profiles,
  type Db,
} from "@thegamies/db";
import {
  libraryEventKindForStatus,
  type LibraryStatus,
} from "@/lib/activity/kinds";
import { seedAccountsWhere } from "@/lib/seed-accounts";

export const SEED_LIBRARY_GAMES_PER_PROFILE = 10;
export const SEED_LIBRARY_POOL_SIZE = 80;
/** Rank this many released candidates by popularity × recency, then take the pool. */
export const SEED_LIBRARY_CANDIDATE_LIMIT = 400;
/** Only this many hottest titles are eligible for Playing. */
export const SEED_LIBRARY_PLAYING_POOL_SIZE = 12;
export const SEED_LIBRARY_PLAYING_PER_PROFILE = 3;
/** Recency half-life so a month-old hit still counts, January fades. */
export const LIBRARY_SEED_RECENCY_HALF_LIFE_DAYS = 45;
export const LIBRARY_SEED_RECENCY_FLOOR = 0.15;
const WRITE_CHUNK = 100;
const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

const LIBRARY_EVENT_KINDS = [
  "library_wishlist",
  "library_backlog",
  "library_playing",
  "library_paused",
  "library_beat",
  "library_dropped",
  "library_cleared",
  "library_want",
  "library_played",
] as const;

const REST_STATUS_CYCLE: LibraryStatus[] = ["beat", "backlog", "wishlist"];

export type LibrarySeedCandidate = {
  id: string;
  popularity: number;
  firstReleaseDate: Date | null;
};

function librarySeedReleased(now: Date) {
  return and(
    sql`${games.firstReleaseDate} is not null`,
    sql`${games.firstReleaseDate} <= ${now}`,
  );
}

function getDb(): Db {
  return createDb();
}

/** 1 for a game that just released; floor for old-but-out titles. Future/TBA is 0. */
export function librarySeedRecencyWeight(
  firstReleaseDate: Date | null,
  now: Date,
): number {
  if (!firstReleaseDate) return 0;
  const ageMs = now.getTime() - firstReleaseDate.getTime();
  if (ageMs < 0) return 0;
  const ageDays = ageMs / MS_PER_DAY;
  const decay = Math.exp(
    (-Math.LN2 * ageDays) / LIBRARY_SEED_RECENCY_HALF_LIFE_DAYS,
  );
  return LIBRARY_SEED_RECENCY_FLOOR + (1 - LIBRARY_SEED_RECENCY_FLOOR) * decay;
}

/** Popularity scaled by how recently the game actually came out. */
export function librarySeedPlayingHeat(
  popularity: number,
  firstReleaseDate: Date | null,
  now: Date,
): number {
  const recency = librarySeedRecencyWeight(firstReleaseDate, now);
  if (recency <= 0) return 0;
  return Math.max(popularity, 0) * recency;
}

export function rankLibrarySeedPool(
  candidates: readonly LibrarySeedCandidate[],
  now: Date,
  limit = SEED_LIBRARY_POOL_SIZE,
): string[] {
  return [...candidates]
    .map((row) => ({
      id: row.id,
      heat: librarySeedPlayingHeat(row.popularity, row.firstReleaseDate, now),
    }))
    .filter((row) => row.heat > 0)
    .sort((a, b) => b.heat - a.heat || a.id.localeCompare(b.id))
    .slice(0, limit)
    .map((row) => row.id);
}

export function seedLibraryGameIdsForIndex(
  pool: readonly string[],
  profileIndex: number,
  count = SEED_LIBRARY_GAMES_PER_PROFILE,
): string[] {
  if (pool.length === 0 || count <= 0) return [];
  const take = Math.min(count, pool.length);
  const start = (profileIndex * 2) % pool.length;
  const ids: string[] = [];
  for (let i = 0; i < take; i += 1) {
    ids.push(pool[(start + i) % pool.length]!);
  }
  return ids;
}

export type LibrarySeedAssignment = {
  gameId: string;
  status: LibraryStatus;
};

/**
 * Playing rotates through the hottest popular-recent titles so many accounts
 * share them. Beat / Backlog / Wishlist come from the rest of the pool.
 */
export function seedLibraryAssignmentsForIndex(
  pool: readonly string[],
  profileIndex: number,
): LibrarySeedAssignment[] {
  if (pool.length === 0) return [];
  const playingSource = pool.slice(
    0,
    Math.min(SEED_LIBRARY_PLAYING_POOL_SIZE, pool.length),
  );
  const playingIds = seedLibraryGameIdsForIndex(
    playingSource,
    profileIndex,
    SEED_LIBRARY_PLAYING_PER_PROFILE,
  );
  const playingSet = new Set(playingIds);
  const restSource = pool.filter((id) => !playingSet.has(id));
  const restCount = Math.max(
    0,
    SEED_LIBRARY_GAMES_PER_PROFILE - playingIds.length,
  );
  const restIds = seedLibraryGameIdsForIndex(
    restSource,
    profileIndex,
    restCount,
  );
  return [
    ...playingIds.map((gameId) => ({
      gameId,
      status: "playing" as const,
    })),
    ...restIds.map((gameId, index) => ({
      gameId,
      status: REST_STATUS_CYCLE[index % REST_STATUS_CYCLE.length]!,
    })),
  ];
}

export function seedLibraryEventTime(
  now: Date,
  profileIndex: number,
  gameIndex: number,
  status: LibraryStatus = "backlog",
): Date {
  if (status === "playing") {
    const hoursAgo = 1 + ((profileIndex * 3 + gameIndex * 2) % 23);
    return new Date(now.getTime() - hoursAgo * MS_PER_HOUR);
  }
  const hoursAgo = 24 + ((profileIndex * 7 + gameIndex * 5) % (24 * 4));
  return new Date(now.getTime() - hoursAgo * MS_PER_HOUR);
}

async function listSeedProfileIds(db: Db): Promise<string[]> {
  const rows = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(and(seedAccountsWhere(), isNull(profiles.deletedAt)));
  return rows.map((row) => row.id);
}

async function loadReleasedCandidates(
  db: Db,
  now: Date,
  year: number | null,
): Promise<LibrarySeedCandidate[]> {
  const filters = [
    eq(games.isAdult, false),
    isNull(games.versionParentIgdbId),
    librarySeedReleased(now),
  ];
  if (year != null) filters.push(eq(games.year, year));
  const rows = await db
    .select({
      id: games.id,
      popularity: games.popularity,
      firstReleaseDate: games.firstReleaseDate,
    })
    .from(games)
    .where(and(...filters))
    .orderBy(desc(games.popularity), games.id)
    .limit(SEED_LIBRARY_CANDIDATE_LIMIT);
  return rows;
}

async function loadLibrarySeedPool(db: Db, now: Date): Promise<string[]> {
  const year = now.getUTCFullYear();
  const yearCandidates = await loadReleasedCandidates(db, now, year);
  const yearPool = rankLibrarySeedPool(yearCandidates, now);
  if (yearPool.length >= 8) return yearPool;
  const anyReleased = await loadReleasedCandidates(db, now, null);
  const releasedPool = rankLibrarySeedPool(anyReleased, now);
  if (releasedPool.length > 0) return releasedPool;
  const anyYear = await db
    .select({ id: games.id })
    .from(games)
    .where(
      and(eq(games.isAdult, false), isNull(games.versionParentIgdbId)),
    )
    .orderBy(desc(games.popularity), games.id)
    .limit(SEED_LIBRARY_POOL_SIZE);
  return anyYear.map((row) => row.id);
}

async function forChunks<T>(
  items: T[],
  fn: (chunk: T[]) => Promise<void>,
): Promise<void> {
  for (let i = 0; i < items.length; i += WRITE_CHUNK) {
    await fn(items.slice(i, i + WRITE_CHUNK));
  }
}

export async function clearSeedLibraries(
  db: Db = getDb(),
): Promise<{ profiles: number; entries: number }> {
  const profileIds = await listSeedProfileIds(db);
  if (profileIds.length === 0) {
    return { profiles: 0, entries: 0 };
  }

  let entries = 0;
  await forChunks(profileIds, async (chunk) => {
    const deleted = await db
      .delete(libraryEntries)
      .where(inArray(libraryEntries.profileId, chunk))
      .returning({ profileId: libraryEntries.profileId });
    entries += deleted.length;
    await db.delete(activityEvents).where(
      and(
        inArray(activityEvents.profileId, chunk),
        inArray(activityEvents.kind, [...LIBRARY_EVENT_KINDS]),
      ),
    );
  });

  return { profiles: profileIds.length, entries };
}

export async function seedLibrariesForSeedAccounts(
  db: Db = getDb(),
  now = new Date(),
): Promise<
  | {
      profiles: number;
      entries: number;
      gamePoolSize: number;
    }
  | { error: string }
> {
  const profileIds = await listSeedProfileIds(db);
  if (profileIds.length === 0) {
    return {
      error:
        "No seed accounts yet. Create standings or community seeds first.",
    };
  }
  const pool = await loadLibrarySeedPool(db, now);
  if (pool.length === 0) {
    return { error: "No games in the catalog yet." };
  }

  await clearSeedLibraries(db);

  const entryRows: Array<{
    profileId: string;
    gameId: string;
    status: LibraryStatus;
    visibility: "public";
    updatedAt: Date;
  }> = [];
  const eventRows: Array<{
    profileId: string;
    kind: ReturnType<typeof libraryEventKindForStatus>;
    batchId: string;
    gameId: string;
    createdAt: Date;
  }> = [];

  profileIds.forEach((profileId, profileIndex) => {
    const assignments = seedLibraryAssignmentsForIndex(pool, profileIndex);
    assignments.forEach((row, gameIndex) => {
      const createdAt = seedLibraryEventTime(
        now,
        profileIndex,
        gameIndex,
        row.status,
      );
      entryRows.push({
        profileId,
        gameId: row.gameId,
        status: row.status,
        visibility: "public",
        updatedAt: createdAt,
      });
      eventRows.push({
        profileId,
        kind: libraryEventKindForStatus(row.status),
        batchId: crypto.randomUUID(),
        gameId: row.gameId,
        createdAt,
      });
    });
  });

  await forChunks(entryRows, async (chunk) => {
    await db.insert(libraryEntries).values(chunk);
  });
  await forChunks(eventRows, async (chunk) => {
    await db.insert(activityEvents).values(chunk);
  });

  return {
    profiles: profileIds.length,
    entries: entryRows.length,
    gamePoolSize: pool.length,
  };
}
