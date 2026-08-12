import { and, desc, eq, inArray, isNull, like, sql } from "drizzle-orm";
import {
  createDb,
  games,
  listItems,
  lists,
  liveCategoryContrib,
  liveGotyContrib,
  profiles,
  type Db,
} from "@thegamies/db";
import { buildGotyContribRows } from "@/lib/live-aggregate/scoring";
import { generatePublicId } from "@/lib/lists/secrets";
import { gotySlugForYear } from "@/lib/lists/rules";
import { rebuildYear } from "@/lib/live-aggregate/refresh";

export const SEED_AUTH_PREFIX = "seed:standings:";
export const SEED_USERNAME_PREFIX = "seedvoter";
export const SEED_MAX_INDEX = 1000;
export const SEED_MAX_BATCH = 100;

function getDb(): Db {
  return createDb();
}

export function seedAuthUserId(index: number): string {
  return `${SEED_AUTH_PREFIX}${String(index).padStart(4, "0")}`;
}

export function seedUsername(index: number): string {
  return `${SEED_USERNAME_PREFIX}${String(index).padStart(3, "0")}`;
}

type PoolGame = {
  id: string;
  rating: number | null;
  popularity: number;
};

/**
 * Bias −100…100: 0 = uniform, positive prefers highly rated, negative prefers lower-rated.
 */
export function weightForRatedGame(
  game: { rating: number | null; popularity: number },
  bias: number,
): number {
  const rating = game.rating ?? 50;
  const pop = Math.max(game.popularity, 0);
  const quality = Math.min(
    100,
    Math.max(1, rating * 0.75 + Math.min(100, Math.log10(pop + 1) * 28) * 0.25),
  );
  const t = Math.max(-100, Math.min(100, bias)) / 100;
  if (Math.abs(t) < 0.02) return 1;
  if (t > 0) {
    return (quality / 100) ** (1 + t * 5) + 0.001;
  }
  return ((100 - quality) / 100) ** (1 + Math.abs(t) * 5) + 0.001;
}

/** Weighted sample without replacement. */
export function weightedSample<T>(
  items: T[],
  k: number,
  weightOf: (item: T) => number,
): T[] {
  if (k <= 0 || items.length === 0) return [];
  if (k >= items.length) return shuffle([...items]);

  type Keyed = { item: T; key: number };
  const keyed: Keyed[] = items.map((item) => {
    const w = Math.max(weightOf(item), 1e-9);
    const u = Math.random();
    // Efraimidis–Spirakis: key = u^(1/w)
    return { item, key: u ** (1 / w) };
  });
  keyed.sort((a, b) => b.key - a.key);
  return keyed.slice(0, k).map((row) => row.item);
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

async function loadSeedGamePool(
  year: number,
  poolSize: number,
  db: Db,
): Promise<PoolGame[]> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const limit = Math.min(2000, Math.max(50, Math.floor(poolSize)));

  return db
    .select({
      id: games.id,
      rating: games.rating,
      popularity: games.popularity,
    })
    .from(games)
    .where(
      and(
        eq(games.year, year),
        eq(games.isAdult, false),
        isNull(games.versionParentIgdbId),
        sql`${games.firstReleaseDate} is not null`,
        sql`${games.firstReleaseDate} <= ${today}`,
      ),
    )
    .orderBy(desc(games.popularity), desc(games.rating))
    .limit(limit);
}

export type SeedStandingsInput = {
  year: number;
  /** 1-based inclusive start index for seedvoterNNN. */
  startIndex?: number;
  /** How many voters in this batch (capped at SEED_MAX_BATCH). */
  count: number;
  listSize?: number;
  /** −100…100 rating bias for game picks. */
  ratingBias?: number;
  /** Size of candidate game pool (default 500). */
  poolSize?: number;
  /** When false, skip voters that already have a GOTY list for the year. */
  reseed?: boolean;
  /** Rebuild year score cache after this batch (default true). */
  rebuild?: boolean;
};

export type SeedStandingsResult = {
  createdProfiles: number;
  createdLists: number;
  updatedLists: number;
  skipped: number;
  year: number;
  gamePoolSize: number;
  startIndex: number;
  endIndex: number;
  nextIndex: number;
};

export async function getMaxSeedIndex(
  db: Db = getDb(),
): Promise<number> {
  const rows = await db
    .select({ authUserId: profiles.authUserId })
    .from(profiles)
    .where(like(profiles.authUserId, `${SEED_AUTH_PREFIX}%`));

  let max = 0;
  for (const row of rows) {
    const suffix = row.authUserId.slice(SEED_AUTH_PREFIX.length);
    const n = Number(suffix);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max;
}

/**
 * Create/update a batch of synthetic GOTY voters.
 * Use startIndex + count for paging up to SEED_MAX_INDEX; client can loop until stopped.
 */
export async function seedStandingsVoters(
  input: SeedStandingsInput,
  db: Db = getDb(),
): Promise<SeedStandingsResult | { error: string }> {
  const year = Math.floor(input.year);
  const startIndex = Math.max(1, Math.floor(input.startIndex ?? 1));
  const count = Math.floor(input.count);
  const listSize = Math.min(10, Math.max(1, Math.floor(input.listSize ?? 10)));
  const ratingBias = Math.max(
    -100,
    Math.min(100, Math.floor(input.ratingBias ?? 40)),
  );
  const poolSize = Math.min(2000, Math.max(50, Math.floor(input.poolSize ?? 500)));
  const reseed = input.reseed !== false;
  const doRebuild = input.rebuild !== false;

  if (!Number.isFinite(year) || year < 1970 || year > 2100) {
    return { error: "Pick a valid year." };
  }
  if (!Number.isFinite(count) || count < 1 || count > SEED_MAX_BATCH) {
    return {
      error: `Each batch can create between 1 and ${SEED_MAX_BATCH} voters.`,
    };
  }
  if (startIndex > SEED_MAX_INDEX) {
    return { error: `Seed index cannot exceed ${SEED_MAX_INDEX}.` };
  }

  const endIndex = Math.min(SEED_MAX_INDEX, startIndex + count - 1);
  const indices = Array.from(
    { length: endIndex - startIndex + 1 },
    (_, i) => startIndex + i,
  );

  const pool = await loadSeedGamePool(year, poolSize, db);
  if (pool.length < listSize) {
    return {
      error: `Need at least ${listSize} released ${year} games in the catalog to seed lists.`,
    };
  }

  const wantedAuthIds = indices.map(seedAuthUserId);
  const wantedUsernames = indices.map(seedUsername);

  const existingProfiles = await db
    .select()
    .from(profiles)
    .where(inArray(profiles.authUserId, wantedAuthIds));
  const byAuth = new Map(existingProfiles.map((p) => [p.authUserId, p]));

  const missing = indices
    .map((index, i) => ({
      index,
      authUserId: wantedAuthIds[i]!,
      username: wantedUsernames[i]!,
      displayName: `Seed Voter ${index}`,
    }))
    .filter((row) => !byAuth.has(row.authUserId));

  if (missing.length > 0) {
    const usernameClash = await db
      .select({ username: profiles.username })
      .from(profiles)
      .where(
        inArray(
          profiles.username,
          missing.map((m) => m.username),
        ),
      );
    if (usernameClash.length > 0) {
      return {
        error: `Username ${usernameClash[0]!.username} is already taken by a non-seed account.`,
      };
    }

    const inserted = await db
      .insert(profiles)
      .values(
        missing.map((m) => ({
          authUserId: m.authUserId,
          username: m.username,
          displayName: m.displayName,
          visibility: "public" as const,
          bio: "Synthetic standings seed account.",
        })),
      )
      .returning();
    for (const profile of inserted) {
      byAuth.set(profile.authUserId, profile);
    }
  }

  const profilesInOrder = wantedAuthIds.map((id) => byAuth.get(id)!);
  const profileIds = profilesInOrder.map((p) => p.id);

  const existingLists = await db
    .select()
    .from(lists)
    .where(
      and(
        inArray(lists.profileId, profileIds),
        eq(lists.listType, "goty"),
        eq(lists.year, year),
      ),
    );
  const listByProfile = new Map(
    existingLists
      .filter((l) => l.profileId != null)
      .map((l) => [l.profileId!, l]),
  );

  let skipped = 0;
  const activeProfiles = profilesInOrder.filter((profile) => {
    if (reseed) return true;
    if (listByProfile.has(profile.id)) {
      skipped += 1;
      return false;
    }
    return true;
  });

  if (activeProfiles.length === 0) {
    return {
      createdProfiles: missing.length,
      createdLists: 0,
      updatedLists: 0,
      skipped,
      year,
      gamePoolSize: pool.length,
      startIndex,
      endIndex,
      nextIndex: endIndex + 1,
    };
  }

  const now = new Date();
  const listsToCreate = activeProfiles.filter((p) => !listByProfile.has(p.id));
  if (listsToCreate.length > 0) {
    const insertedLists = await db
      .insert(lists)
      .values(
        listsToCreate.map((profile) => ({
          publicId: generatePublicId(),
          profileId: profile.id,
          listType: "goty" as const,
          title: `${year} Game of the Year`,
          year,
          slug: gotySlugForYear(year),
          publishedAt: now,
          updatedAt: now,
        })),
      )
      .returning();
    for (const list of insertedLists) {
      if (list.profileId) listByProfile.set(list.profileId, list);
    }
  }

  const allLists = activeProfiles.map((p) => listByProfile.get(p.id)!);
  const listIds = allLists.map((l) => l.id);
  const updatedLists = allLists.length - listsToCreate.length;

  await db.delete(listItems).where(inArray(listItems.listId, listIds));

  const itemRows: {
    listId: string;
    gameId: string;
    rank: number;
    blurb: null;
  }[] = [];
  const contribRows: {
    listId: string;
    gameId: string;
    profileId: string;
    year: number;
    rank: number;
    points: number;
  }[] = [];

  for (const list of allLists) {
    const picks = weightedSample(pool, listSize, (game) =>
      weightForRatedGame(game, ratingBias),
    );
    for (let rank = 0; rank < picks.length; rank += 1) {
      const game = picks[rank]!;
      itemRows.push({
        listId: list.id,
        gameId: game.id,
        rank: rank + 1,
        blurb: null,
      });
    }
    const scored = buildGotyContribRows(
      picks.map((game, index) => ({
        gameId: game.id,
        rank: index + 1,
        isAdult: false,
      })),
    );
    for (const row of scored) {
      contribRows.push({
        listId: list.id,
        gameId: row.gameId,
        profileId: list.profileId!,
        year,
        rank: row.rank,
        points: row.points,
      });
    }
  }

  if (itemRows.length > 0) {
    await db.insert(listItems).values(itemRows);
  }

  await db
    .delete(liveGotyContrib)
    .where(inArray(liveGotyContrib.listId, listIds));
  await db
    .delete(liveCategoryContrib)
    .where(inArray(liveCategoryContrib.listId, listIds));
  if (contribRows.length > 0) {
    await db.insert(liveGotyContrib).values(contribRows);
  }

  await db
    .update(lists)
    .set({ updatedAt: now })
    .where(inArray(lists.id, listIds));

  if (doRebuild) {
    await rebuildYear(year, db);
  }

  return {
    createdProfiles: missing.length,
    createdLists: listsToCreate.length,
    updatedLists,
    skipped,
    year,
    gamePoolSize: pool.length,
    startIndex,
    endIndex,
    nextIndex: endIndex + 1,
  };
}

export async function clearStandingsSeeds(
  year?: number,
  db: Db = getDb(),
): Promise<{ deletedProfiles: number; deletedLists: number; years: number[] }> {
  const seedProfiles = await db
    .select()
    .from(profiles)
    .where(like(profiles.authUserId, `${SEED_AUTH_PREFIX}%`));

  if (seedProfiles.length === 0) {
    return { deletedProfiles: 0, deletedLists: 0, years: [] };
  }

  const profileIds = seedProfiles.map((p) => p.id);
  const conditions = [inArray(lists.profileId, profileIds)];
  if (year != null) {
    conditions.push(eq(lists.year, year));
  }

  const listRows = await db
    .select()
    .from(lists)
    .where(and(...conditions));

  const years = [
    ...new Set(
      listRows
        .map((l) => l.year)
        .filter((y): y is number => typeof y === "number"),
    ),
  ];

  const listIds = listRows.map((l) => l.id);
  if (listIds.length > 0) {
    await db
      .delete(liveGotyContrib)
      .where(inArray(liveGotyContrib.listId, listIds));
    await db
      .delete(liveCategoryContrib)
      .where(inArray(liveCategoryContrib.listId, listIds));
    await db.delete(lists).where(inArray(lists.id, listIds));
  }

  let deletedProfiles = 0;
  if (year == null) {
    await db.delete(profiles).where(inArray(profiles.id, profileIds));
    deletedProfiles = profileIds.length;
  } else {
    const remaining = await db
      .select({ profileId: lists.profileId })
      .from(lists)
      .where(inArray(lists.profileId, profileIds));
    const stillUsed = new Set(
      remaining
        .map((r) => r.profileId)
        .filter((id): id is string => Boolean(id)),
    );
    const orphanIds = profileIds.filter((id) => !stillUsed.has(id));
    if (orphanIds.length > 0) {
      await db.delete(profiles).where(inArray(profiles.id, orphanIds));
      deletedProfiles = orphanIds.length;
    }
  }

  for (const y of years) {
    try {
      await rebuildYear(y, db);
    } catch {
      // ignore
    }
  }

  return {
    deletedProfiles,
    deletedLists: listIds.length,
    years,
  };
}

export async function countStandingsSeeds(db: Db = getDb()): Promise<{
  profiles: number;
  lists: number;
  maxIndex: number;
}> {
  const [profileCount] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(profiles)
    .where(like(profiles.authUserId, `${SEED_AUTH_PREFIX}%`));

  const seedProfiles = await db
    .select({ id: profiles.id, authUserId: profiles.authUserId })
    .from(profiles)
    .where(like(profiles.authUserId, `${SEED_AUTH_PREFIX}%`));

  let maxIndex = 0;
  for (const row of seedProfiles) {
    const n = Number(row.authUserId.slice(SEED_AUTH_PREFIX.length));
    if (Number.isFinite(n) && n > maxIndex) maxIndex = n;
  }

  if (seedProfiles.length === 0) {
    return {
      profiles: Number(profileCount?.n ?? 0),
      lists: 0,
      maxIndex: 0,
    };
  }

  const [listCount] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(lists)
    .where(inArray(lists.profileId, seedProfiles.map((p) => p.id)));

  return {
    profiles: Number(profileCount?.n ?? 0),
    lists: Number(listCount?.n ?? 0),
    maxIndex,
  };
}
