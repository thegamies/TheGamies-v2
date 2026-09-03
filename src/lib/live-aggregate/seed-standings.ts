import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import {
  createDb,
  games,
  listCategoryVotes,
  listItems,
  lists,
  liveCategoryContrib,
  liveGotyContrib,
  profiles,
  type Db,
} from "@thegamies/db";
import {
  ensureAwardCategories,
  listActiveAwardCategories,
} from "@/lib/live-aggregate/categories";
import { buildGotyContribRows } from "@/lib/live-aggregate/scoring";
import { generatePublicId } from "@/lib/lists/secrets";
import { gotySlugForYear } from "@/lib/lists/rules";
import { rebuildYear } from "@/lib/live-aggregate/refresh";
import { insertInChunks } from "@/lib/db/insert-chunks";
import {
  markProfilesAsSeed,
  seedAccountsWithAuthPrefixWhere,
  seedProfileCreateFields,
} from "@/lib/seed-accounts";
import {
  applySeedWeightPower,
  igdbPickWeight,
  normalizeSeedSampling,
  sampleSeedList,
  SEED_POOL_HARD_CAP,
  shuffle,
  type SeedDistribution,
} from "@/lib/live-aggregate/seed-sampling";

export const SEED_AUTH_PREFIX = "seed:standings:";
export const SEED_USERNAME_PREFIX = "seedvoter";
export const SEED_MAX_INDEX = 1000;
export const SEED_MAX_BATCH = 100;
/** Neon HTTP inserts stay reliable when category vote batches stay small. */
export const SEED_INSERT_CHUNK = 200;

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
  ratingCount: number | null;
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

/**
 * Weight for choosing a GOTY-ranked game as a category pick.
 * Higher ranks (#1…) dominate so category leaders separate instead of tying.
 * Default power ~2.4 → rank 1 is ~5× rank 2 and ~13× rank 3.
 */
export function weightForTopRank(rank: number, power = 2.4): number {
  const r = Math.max(1, Math.floor(rank));
  return 1 / r ** power;
}

/**
 * Pick category votes from a voter's ranked GOTY list.
 * Participation defaults high; game choice is top-rank weighted.
 */
export function buildSeedCategoryVotes(
  categories: Array<{ id: string }>,
  rankedPicks: Array<{ id: string }>,
  opts: { participationRate?: number; rankPower?: number } = {},
): Array<{ categoryId: string; gameId: string }> {
  if (categories.length === 0 || rankedPicks.length === 0) return [];
  const participationRate = opts.participationRate ?? 0.88;
  const rankPower = opts.rankPower ?? 2.4;
  const ranked = rankedPicks.map((game, index) => ({
    gameId: game.id,
    rank: index + 1,
  }));

  const votes: Array<{ categoryId: string; gameId: string }> = [];
  for (const cat of categories) {
    if (Math.random() >= participationRate) continue;
    const [choice] = weightedSample(ranked, 1, (row) =>
      weightForTopRank(row.rank, rankPower),
    );
    if (!choice) continue;
    votes.push({ categoryId: cat.id, gameId: choice.gameId });
  }
  return votes;
}

function eligibleSeedGamesWhere(
  year: number,
  today: Date,
  opts: { allowNullReleaseDate: boolean },
) {
  const release =
    opts.allowNullReleaseDate
      ? or(
          isNull(games.firstReleaseDate),
          sql`${games.firstReleaseDate} <= ${today}`,
        )
      : and(
          sql`${games.firstReleaseDate} is not null`,
          sql`${games.firstReleaseDate} <= ${today}`,
        );
  return and(
    eq(games.year, year),
    eq(games.isAdult, false),
    isNull(games.versionParentIgdbId),
    release,
  );
}

const seedGameSelect = {
  id: games.id,
  rating: games.rating,
  ratingCount: games.ratingCount,
  popularity: games.popularity,
};

export async function loadSeedGamePool(
  year: number,
  poolSize: number,
  db: Db = getDb(),
): Promise<PoolGame[]> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const limit = Math.min(2000, Math.max(50, Math.floor(poolSize)));

  return db
    .select(seedGameSelect)
    .from(games)
    .where(eligibleSeedGamesWhere(year, today, { allowNullReleaseDate: false }))
    .orderBy(desc(games.popularity), desc(games.rating))
    .limit(limit);
}

const igdbRawPickWeightSql = sql`
  ln(1 + greatest(coalesce(${games.ratingCount}, 0), 0)::double precision)
  * (coalesce(${games.rating}, 75)::double precision / 100.0)
`;

/**
 * Eligible year games, trimmed to top N by IGDB critic-count × rating.
 * `topN` null/0 → hard cap (Worker-safe).
 */
export async function loadIgdbWeightedSeedPool(
  year: number,
  topN: number | null,
  db: Db = getDb(),
): Promise<PoolGame[]> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const limit =
    topN == null
      ? SEED_POOL_HARD_CAP
      : Math.min(SEED_POOL_HARD_CAP, Math.max(1, Math.floor(topN)));

  return db
    .select(seedGameSelect)
    .from(games)
    .where(eligibleSeedGamesWhere(year, today, { allowNullReleaseDate: true }))
    .orderBy(desc(igdbRawPickWeightSql), desc(games.ratingCount), games.id)
    .limit(limit);
}

export type SeedStandingsInput = {
  year: number;
  /** 1-based inclusive start index for seedvoterNNN. */
  startIndex?: number;
  /** How many voters in this batch (capped at SEED_MAX_BATCH). */
  count: number;
  /** Random list length lower bound (default 1). */
  minGamesPerList?: number;
  /** Random list length upper bound (default 10). */
  maxGamesPerList?: number;
  minRank?: number;
  maxRank?: number;
  distribution?: SeedDistribution;
  /** Limit pool to top N by IGDB weight. Null/0 = no limit (hard-capped). */
  topN?: number | null;
  /** Weight sharpness 0.1–5 (default 1). */
  weightPower?: number;
  /** When true, also write category votes from each GOTY list. */
  includeCategories?: boolean;
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
  /** Active award categories used for this batch (after catalog ensure). */
  categoryCount: number;
  /** list_category_votes rows written in this batch. */
  categoryVotes: number;
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
    .where(seedAccountsWithAuthPrefixWhere(SEED_AUTH_PREFIX));

  let max = 0;
  for (const row of rows) {
    const suffix = row.authUserId.slice(SEED_AUTH_PREFIX.length);
    const n = Number(suffix);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max;
}

/**
 * Where "Seed N" should begin.
 * Reseed on → rewrite from index 1.
 * Reseed off → append after the highest existing seed index.
 */
export function resolveSeedStartIndex(opts: {
  reseed: boolean;
  maxIndex: number;
}): number {
  if (opts.reseed) return 1;
  return Math.max(1, Math.floor(opts.maxIndex) + 1);
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
  const sampling = normalizeSeedSampling({
    minGamesPerList: input.minGamesPerList ?? 1,
    maxGamesPerList: input.maxGamesPerList ?? 10,
    minRank: input.minRank ?? 1,
    maxRank: input.maxRank ?? 10,
    distribution: input.distribution ?? "weighted",
    topN: input.topN,
    weightPower: input.weightPower,
  });
  if ("error" in sampling) return sampling;
  const includeCategories = input.includeCategories === true;
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

  const pool = await loadIgdbWeightedSeedPool(year, sampling.topN, db);
  if (pool.length === 0) {
    return {
      error: `Need ${year} games in the catalog to seed lists.`,
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
          ...seedProfileCreateFields(),
        })),
      )
      .returning();
    for (const profile of inserted) {
      byAuth.set(profile.authUserId, profile);
    }
  }

  const profilesInOrder = wantedAuthIds.map((id) => byAuth.get(id)!);
  const profileIds = profilesInOrder.map((p) => p.id);
  await markProfilesAsSeed(profileIds, db);

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
      categoryCount: 0,
      categoryVotes: 0,
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

  let categories: Array<{ id: string }> = [];
  if (includeCategories) {
    await ensureAwardCategories(db);
    categories = await listActiveAwardCategories(db);
    if (categories.length === 0) {
      return {
        error:
          "No active award categories found after syncing the catalog. Check award category migrations.",
      };
    }
  }

  await db.delete(listItems).where(inArray(listItems.listId, listIds));
  await db
    .delete(listCategoryVotes)
    .where(inArray(listCategoryVotes.listId, listIds));

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
  const categoryVoteRows: {
    listId: string;
    categoryId: string;
    gameId: string;
  }[] = [];
  const categoryContribRows: {
    listId: string;
    categoryId: string;
    profileId: string;
    year: number;
    gameId: string;
  }[] = [];

  const weightOf = (game: PoolGame) =>
    applySeedWeightPower(
      igdbPickWeight(game.rating, game.ratingCount),
      sampling.weightPower,
    );

  for (const list of allLists) {
    const { picks, ranks } = sampleSeedList(pool, sampling, weightOf);
    for (let i = 0; i < picks.length; i += 1) {
      const game = picks[i]!;
      itemRows.push({
        listId: list.id,
        gameId: game.id,
        rank: ranks[i]!,
        blurb: null,
      });
    }
    const scored = buildGotyContribRows(
      picks.map((game, index) => ({
        gameId: game.id,
        rank: ranks[index]!,
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

    if (!includeCategories) continue;
    const catVotes = buildSeedCategoryVotes(categories, picks);
    for (const vote of catVotes) {
      categoryVoteRows.push({
        listId: list.id,
        categoryId: vote.categoryId,
        gameId: vote.gameId,
      });
      categoryContribRows.push({
        listId: list.id,
        categoryId: vote.categoryId,
        profileId: list.profileId!,
        year,
        gameId: vote.gameId,
      });
    }
  }

  if (itemRows.length > 0) {
    await insertInChunks(
      itemRows,
      (chunk) => db.insert(listItems).values(chunk),
      SEED_INSERT_CHUNK,
    );
  }
  if (categoryVoteRows.length > 0) {
    await insertInChunks(
      categoryVoteRows,
      (chunk) => db.insert(listCategoryVotes).values(chunk),
      SEED_INSERT_CHUNK,
    );
  }

  await db
    .delete(liveGotyContrib)
    .where(inArray(liveGotyContrib.listId, listIds));
  await db
    .delete(liveCategoryContrib)
    .where(inArray(liveCategoryContrib.listId, listIds));
  if (contribRows.length > 0) {
    await insertInChunks(
      contribRows,
      (chunk) => db.insert(liveGotyContrib).values(chunk),
      SEED_INSERT_CHUNK,
    );
  }
  if (categoryContribRows.length > 0) {
    await insertInChunks(
      categoryContribRows,
      (chunk) => db.insert(liveCategoryContrib).values(chunk),
      SEED_INSERT_CHUNK,
    );
  }

  await db
    .update(lists)
    .set({ updatedAt: now })
    .where(inArray(lists.id, listIds));

  if (doRebuild) {
    try {
      await rebuildYear(year, db);
    } catch (err) {
      const detail =
        err instanceof Error ? err.message : "Standings rebuild failed.";
      return {
        error: `Seed lists were written, but rebuilding standings failed (${detail}). Open Rankings and run Rebuild for ${year}.`,
      };
    }
  }

  return {
    createdProfiles: missing.length,
    createdLists: listsToCreate.length,
    updatedLists,
    skipped,
    year,
    gamePoolSize: pool.length,
    categoryCount: categories.length,
    categoryVotes: categoryVoteRows.length,
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
    .where(seedAccountsWithAuthPrefixWhere(SEED_AUTH_PREFIX));

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
    .where(seedAccountsWithAuthPrefixWhere(SEED_AUTH_PREFIX));

  const seedProfiles = await db
    .select({ id: profiles.id, authUserId: profiles.authUserId })
    .from(profiles)
    .where(seedAccountsWithAuthPrefixWhere(SEED_AUTH_PREFIX));

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
