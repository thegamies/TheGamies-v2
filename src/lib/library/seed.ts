import { and, desc, eq, inArray, isNull } from "drizzle-orm";
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
const WRITE_CHUNK = 100;

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

const STATUS_CYCLE: LibraryStatus[] = [
  "playing",
  "beat",
  "backlog",
  "wishlist",
];

function getDb(): Db {
  return createDb();
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

export function seedLibraryStatusForIndex(
  profileIndex: number,
  gameIndex: number,
): LibraryStatus {
  return STATUS_CYCLE[(profileIndex + gameIndex) % STATUS_CYCLE.length]!;
}

export function seedLibraryEventTime(
  now: Date,
  profileIndex: number,
  gameIndex: number,
): Date {
  const hoursAgo = 2 + ((profileIndex * 7 + gameIndex * 5) % (24 * 5));
  return new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);
}

async function listSeedProfileIds(db: Db): Promise<string[]> {
  const rows = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(and(seedAccountsWhere(), isNull(profiles.deletedAt)));
  return rows.map((row) => row.id);
}

async function loadLibrarySeedPool(db: Db): Promise<string[]> {
  const year = new Date().getUTCFullYear();
  const where = and(
    eq(games.isAdult, false),
    isNull(games.versionParentIgdbId),
  );
  const yearRows = await db
    .select({ id: games.id })
    .from(games)
    .where(and(where, eq(games.year, year)))
    .orderBy(desc(games.popularity), games.id)
    .limit(SEED_LIBRARY_POOL_SIZE);
  if (yearRows.length >= 8) return yearRows.map((row) => row.id);
  const anyYear = await db
    .select({ id: games.id })
    .from(games)
    .where(where)
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
  const pool = await loadLibrarySeedPool(db);
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
    const gameIds = seedLibraryGameIdsForIndex(pool, profileIndex);
    gameIds.forEach((gameId, gameIndex) => {
      const status = seedLibraryStatusForIndex(profileIndex, gameIndex);
      const createdAt = seedLibraryEventTime(now, profileIndex, gameIndex);
      entryRows.push({
        profileId,
        gameId,
        status,
        visibility: "public",
        updatedAt: createdAt,
      });
      eventRows.push({
        profileId,
        kind: libraryEventKindForStatus(status),
        batchId: crypto.randomUUID(),
        gameId,
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
