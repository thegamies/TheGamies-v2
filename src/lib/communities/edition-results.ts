import { and, asc, desc, eq, gt, gte, inArray, lte, sql } from "drizzle-orm";
import {
  listEditionAwardCategories,
  listEditionEnabledCategoryIds,
} from "@/lib/communities/edition-categories";
import {
  communityEditionBallotCategoryVotes,
  communityEditionBallotItems,
  communityEditionBallots,
  communityEditionCategories,
  communityEditionResultCategories,
  communityEditionResultGoty,
  communityEditionResultMeta,
  communityEditionResultVoterCategoryPicks,
  communityEditionResultVoterRanks,
  communityEditionResultVoters,
  communityEditionVoices,
  communityEditions,
  covers,
  createDb,
  games,
  profiles,
  type Db,
} from "@thegamies/db";
import { insertInChunks } from "@/lib/db/insert-chunks";
import { STANDINGS_PAGE_SIZE } from "@/lib/live-aggregate/service";
import {
  assembleBallotMatrixRows,
  assembleCategoryComparisonRows,
  BALLOT_MATRIX_TOP,
  categoryComparisonHasGames,
  matrixHasAnyGames,
  type EditionBallotMatrixRow,
  type EditionCategoryComparisonRow,
  type MatrixGameCell,
  type MatrixVoiceColumn,
} from "./edition-ballot-matrix";
import {
  placeEditionCategoryTallies,
  placeEditionGotyTallies,
  storageModeFor,
  type AggregatedCategoryRow,
  type AggregatedGotyRow,
  type EditionResultMode,
} from "./edition-results-scoring";
import {
  withDisplayRanks,
  withDisplayRanksOnPage,
  type SharedRankMode,
} from "@/lib/standings/shared-rank";
import { getEditionByCommunityYear } from "./editions";
import { listEditionVoiceProfileIds } from "./voices";

export {
  parseEditionRankMode,
  parseEditionResultMode,
  parseEditionResultsView,
  parseEditionSettingsPanel,
  parseEditionShowSource,
  resolveEditionHostSettings,
  type EditionResultsPublicMode,
  type EditionResultsViewId,
  type EditionSettingsPanelId,
  type EditionShowSource,
  type SharedRankMode,
} from "./edition-results-scoring";

export {
  BALLOT_MATRIX_TOP,
  type EditionBallotMatrixRow,
  type EditionCategoryComparisonRow,
  type MatrixGameCell,
  type MatrixVoiceColumn,
} from "./edition-ballot-matrix";

function getDb(): Db {
  return createDb();
}

function coverUrlFrom(imageId: string | null | undefined): string | null {
  if (!imageId) return null;
  return `https://images.igdb.com/igdb/image/upload/t_cover_big/${imageId}.jpg`;
}

export type EditionGotyStandingRow = {
  place: number;
  rank: number;
  gameId: string;
  slug: string;
  title: string;
  year: number | null;
  coverUrl: string | null;
  points: number;
  firstPlaceVotes: number;
  appearances: number;
};

export type EditionCategoryStandingBlock = {
  categoryId: string;
  label: string;
  description: string | null;
  rows: Array<{
    place: number;
    rank: number;
    gameId: string;
    slug: string;
    title: string;
    coverUrl: string | null;
    votes: number;
  }>;
};

export type EditionVoterListRow = {
  profileId: string;
  displayName: string;
  username: string;
  isVoice: boolean;
};

export type EditionResultsMeta = {
  frozenAt: Date;
  ballotCountCommunity: number;
  ballotCountVoices: number;
  gotyTotalCommunity: number;
  gotyTotalVoices: number;
};

export async function getEditionResultsMeta(
  editionId: string,
  db: Db = getDb(),
): Promise<EditionResultsMeta | null> {
  const [row] = await db
    .select()
    .from(communityEditionResultMeta)
    .where(eq(communityEditionResultMeta.editionId, editionId))
    .limit(1);
  if (!row) return null;
  return {
    frozenAt: row.frozenAt,
    ballotCountCommunity: row.ballotCountCommunity,
    ballotCountVoices: row.ballotCountVoices,
    gotyTotalCommunity: row.gotyTotalCommunity,
    gotyTotalVoices: row.gotyTotalVoices,
  };
}

/**
 * Write-once freeze. No-op if meta already exists.
 * Use rebuildEditionResultsFrozen when re-publishing after reopen.
 */
export async function ensureEditionResultsFrozen(
  editionId: string,
  db: Db = getDb(),
): Promise<EditionResultsMeta | { error: string }> {
  return freezeEditionResults(editionId, db);
}

/** Clear existing freeze rows and write a new snapshot from current ballots. */
export async function rebuildEditionResultsFrozen(
  editionId: string,
  db: Db = getDb(),
): Promise<EditionResultsMeta | { error: string }> {
  await clearEditionResultTables(editionId, db);
  return freezeEditionResults(editionId, db);
}

/** Delete freeze snapshot rows only (ballots unchanged). Resets freeze job status. */
export async function clearEditionResultsFrozen(
  editionId: string,
  db: Db = getDb(),
): Promise<void> {
  await clearEditionResultTables(editionId, db);
  await db
    .update(communityEditions)
    .set({
      freezeStatus: "idle",
      freezeStartedAt: null,
      freezeError: null,
      updatedAt: new Date(),
    })
    .where(eq(communityEditions.id, editionId));
}

async function clearEditionResultTables(editionId: string, db: Db) {
  // Legacy freeze tables (voter ranks/picks) may still hold old rows; clear them.
  await db
    .delete(communityEditionResultVoterCategoryPicks)
    .where(
      eq(communityEditionResultVoterCategoryPicks.editionId, editionId),
    );
  await db
    .delete(communityEditionResultVoterRanks)
    .where(eq(communityEditionResultVoterRanks.editionId, editionId));
  await db
    .delete(communityEditionResultVoters)
    .where(eq(communityEditionResultVoters.editionId, editionId));
  await db
    .delete(communityEditionResultCategories)
    .where(eq(communityEditionResultCategories.editionId, editionId));
  await db
    .delete(communityEditionResultGoty)
    .where(eq(communityEditionResultGoty.editionId, editionId));
  await db
    .delete(communityEditionResultMeta)
    .where(eq(communityEditionResultMeta.editionId, editionId));
}

type BallotVoterGameRow = {
  profileId: string;
  gameId: string;
  slug: string;
  title: string;
  coverUrl: string | null;
};

/** GOTY ranks from ballot tables (not freeze copies). Closed/published ballots stay after account tombstone so Comparison host columns remain. */
async function loadBallotVoterRanks(
  editionId: string,
  profileIds: string[],
  db: Db,
): Promise<Array<BallotVoterGameRow & { rank: number }>> {
  if (profileIds.length === 0) return [];
  const rows = await db
    .select({
      profileId: communityEditionBallots.profileId,
      rank: communityEditionBallotItems.rank,
      gameId: communityEditionBallotItems.gameId,
      slug: games.slug,
      title: games.title,
      coverImageId: covers.imageId,
    })
    .from(communityEditionBallotItems)
    .innerJoin(
      communityEditionBallots,
      eq(communityEditionBallots.id, communityEditionBallotItems.ballotId),
    )
    .innerJoin(games, eq(games.id, communityEditionBallotItems.gameId))
    .leftJoin(covers, eq(covers.igdbId, games.coverIgdbId))
    .where(
      and(
        eq(communityEditionBallots.editionId, editionId),
        inArray(communityEditionBallots.profileId, profileIds),
        gte(communityEditionBallotItems.rank, 1),
        sql`${communityEditionBallotItems.rank} <= 10`,
      ),
    )
    .orderBy(
      asc(communityEditionBallots.profileId),
      asc(communityEditionBallotItems.rank),
    );

  return rows.map((r) => ({
    profileId: r.profileId,
    rank: r.rank,
    gameId: r.gameId,
    slug: r.slug,
    title: r.title,
    coverUrl: coverUrlFrom(r.coverImageId),
  }));
}

/** Category picks from ballot tables (not freeze copies). */
async function loadBallotVoterCategoryPicks(
  editionId: string,
  profileIds: string[],
  db: Db,
): Promise<Array<BallotVoterGameRow & { categoryId: string }>> {
  if (profileIds.length === 0) return [];
  const rows = await db
    .select({
      profileId: communityEditionBallots.profileId,
      categoryId: communityEditionBallotCategoryVotes.categoryId,
      gameId: communityEditionBallotCategoryVotes.gameId,
      slug: games.slug,
      title: games.title,
      coverImageId: covers.imageId,
    })
    .from(communityEditionBallotCategoryVotes)
    .innerJoin(
      communityEditionBallots,
      eq(
        communityEditionBallots.id,
        communityEditionBallotCategoryVotes.ballotId,
      ),
    )
    .innerJoin(games, eq(games.id, communityEditionBallotCategoryVotes.gameId))
    .leftJoin(covers, eq(covers.igdbId, games.coverIgdbId))
    .where(
      and(
        eq(communityEditionBallots.editionId, editionId),
        inArray(communityEditionBallots.profileId, profileIds),
      ),
    );

  return rows.map((r) => ({
    profileId: r.profileId,
    categoryId: r.categoryId,
    gameId: r.gameId,
    slug: r.slug,
    title: r.title,
    coverUrl: coverUrlFrom(r.coverImageId),
  }));
}

/**
 * GOTY board tallies via SQL GROUP BY (pointsForRank = 11 − rank for ranks 1–10).
 * Hosts board joins edition voices so only designated Host ballots count.
 */
async function sqlAggregateEditionGoty(
  editionId: string,
  voicesOnly: boolean,
  db: Db,
): Promise<AggregatedGotyRow[]> {
  const pointsExpr = sql<number>`coalesce(sum(11 - ${communityEditionBallotItems.rank}), 0)::int`;
  const firstPlaceExpr = sql<number>`coalesce(sum(case when ${communityEditionBallotItems.rank} = 1 then 1 else 0 end), 0)::int`;
  const appearancesExpr = sql<number>`count(*)::int`;

  const base = db
    .select({
      gameId: communityEditionBallotItems.gameId,
      slug: games.slug,
      title: games.title,
      gameYear: games.year,
      coverImageId: covers.imageId,
      points: pointsExpr,
      firstPlaceVotes: firstPlaceExpr,
      appearances: appearancesExpr,
    })
    .from(communityEditionBallotItems)
    .innerJoin(
      communityEditionBallots,
      eq(communityEditionBallots.id, communityEditionBallotItems.ballotId),
    )
    .innerJoin(games, eq(games.id, communityEditionBallotItems.gameId))
    .leftJoin(covers, eq(covers.igdbId, games.coverIgdbId));

  const withVoices = voicesOnly
    ? base.innerJoin(
        communityEditionVoices,
        and(
          eq(
            communityEditionVoices.editionId,
            communityEditionBallots.editionId,
          ),
          eq(
            communityEditionVoices.profileId,
            communityEditionBallots.profileId,
          ),
        ),
      )
    : base;

  const rows = await withVoices
    .where(
      and(
        eq(communityEditionBallots.editionId, editionId),
        gte(communityEditionBallotItems.rank, 1),
        lte(communityEditionBallotItems.rank, 10),
      ),
    )
    .groupBy(
      communityEditionBallotItems.gameId,
      games.slug,
      games.title,
      games.year,
      covers.imageId,
    )
    .having(sql`sum(11 - ${communityEditionBallotItems.rank}) > 0`);

  return placeEditionGotyTallies(
    rows.map((r) => ({
      gameId: r.gameId,
      slug: r.slug,
      title: r.title,
      gameYear: r.gameYear,
      coverUrl: coverUrlFrom(r.coverImageId),
      points: Number(r.points),
      firstPlaceVotes: Number(r.firstPlaceVotes),
      appearances: Number(r.appearances),
    })),
  );
}

/** Category plurality tallies via SQL GROUP BY; Hosts board joins edition voices. */
async function sqlAggregateEditionCategories(
  editionId: string,
  voicesOnly: boolean,
  db: Db,
): Promise<AggregatedCategoryRow[]> {
  const votesExpr = sql<number>`count(*)::int`;

  const base = db
    .select({
      categoryId: communityEditionBallotCategoryVotes.categoryId,
      gameId: communityEditionBallotCategoryVotes.gameId,
      slug: games.slug,
      title: games.title,
      gameYear: games.year,
      coverImageId: covers.imageId,
      votes: votesExpr,
    })
    .from(communityEditionBallotCategoryVotes)
    .innerJoin(
      communityEditionBallots,
      eq(
        communityEditionBallots.id,
        communityEditionBallotCategoryVotes.ballotId,
      ),
    )
    .innerJoin(games, eq(games.id, communityEditionBallotCategoryVotes.gameId))
    .leftJoin(covers, eq(covers.igdbId, games.coverIgdbId));

  const withVoices = voicesOnly
    ? base.innerJoin(
        communityEditionVoices,
        and(
          eq(
            communityEditionVoices.editionId,
            communityEditionBallots.editionId,
          ),
          eq(
            communityEditionVoices.profileId,
            communityEditionBallots.profileId,
          ),
        ),
      )
    : base;

  const rows = await withVoices
    .where(eq(communityEditionBallots.editionId, editionId))
    .groupBy(
      communityEditionBallotCategoryVotes.categoryId,
      communityEditionBallotCategoryVotes.gameId,
      games.slug,
      games.title,
      games.year,
      covers.imageId,
    );

  return placeEditionCategoryTallies(
    rows.map((r) => ({
      gameId: r.gameId,
      slug: r.slug,
      title: r.title,
      gameYear: r.gameYear,
      coverUrl: coverUrlFrom(r.coverImageId),
      categoryId: r.categoryId,
      votes: Number(r.votes),
    })),
  );
}

async function freezeEditionResults(
  editionId: string,
  db: Db,
): Promise<EditionResultsMeta | { error: string }> {
  const existing = await getEditionResultsMeta(editionId, db);
  if (existing) return existing;

  const ballots = await db
    .select({
      ballotId: communityEditionBallots.id,
      profileId: communityEditionBallots.profileId,
      displayName: profiles.displayName,
      username: profiles.username,
    })
    .from(communityEditionBallots)
    .innerJoin(profiles, eq(profiles.id, communityEditionBallots.profileId))
    .where(eq(communityEditionBallots.editionId, editionId));

  const voiceIds = await listEditionVoiceProfileIds(editionId, db);

  const [communityGoty, voicesGoty, communityCats, voicesCats, editionCats] =
    await Promise.all([
      sqlAggregateEditionGoty(editionId, false, db),
      sqlAggregateEditionGoty(editionId, true, db),
      sqlAggregateEditionCategories(editionId, false, db),
      sqlAggregateEditionCategories(editionId, true, db),
      listEditionAwardCategories(editionId, db),
    ]);

  const catDefById = new Map(editionCats.map((c) => [c.id, c]));
  const enabledCategoryIds = new Set(editionCats.map((c) => c.id));

  const ballotCountCommunity = ballots.length;
  const ballotCountVoices = ballots.filter((b) =>
    voiceIds.has(b.profileId),
  ).length;

  const frozenAt = new Date();
  const meta = {
    frozenAt,
    ballotCountCommunity,
    ballotCountVoices,
    gotyTotalCommunity: communityGoty.length,
    gotyTotalVoices: voicesGoty.length,
  };

  const gotyRows = (["community", "voices"] as const).flatMap((mode) => {
    const rows = mode === "community" ? communityGoty : voicesGoty;
    return rows.map((row) => ({
      editionId,
      mode,
      place: row.place,
      gameId: row.gameId,
      slug: row.slug,
      title: row.title,
      gameYear: row.gameYear,
      coverUrl: row.coverUrl,
      points: row.points,
      firstPlaceVotes: row.firstPlaceVotes,
      appearances: row.appearances,
    }));
  });

  const categoryRows = (["community", "voices"] as const).flatMap((mode) => {
    const rows = mode === "community" ? communityCats : voicesCats;
    return rows
      .filter((row) => enabledCategoryIds.has(row.categoryId))
      .map((row) => {
        const def = catDefById.get(row.categoryId);
        return {
          editionId,
          mode,
          categoryId: row.categoryId,
          label: def?.label ?? row.categoryId,
          description: def?.description ?? null,
          sortOrder: def?.sortOrder ?? 0,
          place: row.place,
          gameId: row.gameId,
          slug: row.slug,
          title: row.title,
          coverUrl: row.coverUrl,
          votes: row.votes,
        };
      });
  });

  const voterRows = ballots.map((b) => ({
    editionId,
    profileId: b.profileId,
    isVoice: voiceIds.has(b.profileId),
    displayName: b.displayName,
    username: b.username,
  }));

  try {
    try {
      await db.insert(communityEditionResultMeta).values({
        editionId,
        ...meta,
      });
    } catch {
      const raced = await getEditionResultsMeta(editionId, db);
      if (raced) return raced;
      return { error: "Could not freeze edition results." };
    }

    if (gotyRows.length > 0) {
      await insertInChunks(
        gotyRows,
        (chunk) => db.insert(communityEditionResultGoty).values(chunk),
        100,
      );
    }
    if (categoryRows.length > 0) {
      await insertInChunks(
        categoryRows,
        (chunk) => db.insert(communityEditionResultCategories).values(chunk),
        100,
      );
    }
    if (voterRows.length > 0) {
      await insertInChunks(
        voterRows,
        (chunk) => db.insert(communityEditionResultVoters).values(chunk),
        200,
      );
    }
    // Voter GOTY ranks + category picks stay on ballot tables (read-only after
    // close). Freezing them duplicated tens of thousands of rows on rebuild.
  } catch (err) {
    // Meta-only / partial freezes would make later ensure() no-ops — clear so
    // publish/rebuild can retry a complete snapshot.
    try {
      await clearEditionResultTables(editionId, db);
    } catch {
      // ignore cleanup errors; surface the original write failure
    }
    const detail =
      err instanceof Error ? err.message : "Could not freeze edition results.";
    return { error: detail };
  }

  return meta;
}

/** Public ensure: kick freeze when published; return meta if ready (non-blocking). */
export async function ensurePublishedEditionResults(
  communityId: string,
  year: number,
  db: Db = getDb(),
): Promise<EditionResultsMeta | null | { error: string }> {
  const edition = await getEditionByCommunityYear(communityId, year, db);
  if (!edition) return null;
  if (edition.status !== "published" && edition.status !== "closed") {
    return null;
  }

  const existing = await getEditionResultsMeta(edition.id, db);
  if (existing) {
    if (edition.freezeStatus !== "ready") {
      const { markEditionFreezeReady } = await import("./edition-freeze");
      await markEditionFreezeReady(edition.id, db);
    }
    return existing;
  }

  const { maybeKickEditionFreeze } = await import("./edition-freeze");
  await maybeKickEditionFreeze(edition, {}, db);
  return null;
}

export async function getEditionGotyPage(
  editionId: string,
  mode: EditionResultMode,
  opts: {
    page?: number;
    pageSize?: number;
    afterPlace?: number;
    rankMode?: SharedRankMode;
  } = {},
  db: Db = getDb(),
): Promise<{
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  rows: EditionGotyStandingRow[];
}> {
  const storage = storageModeFor(mode);
  const pageSize = Math.min(
    200,
    Math.max(1, Math.floor(opts.pageSize ?? STANDINGS_PAGE_SIZE)),
  );
  const afterPlace =
    opts.afterPlace != null && Number.isFinite(opts.afterPlace)
      ? Math.max(0, Math.floor(opts.afterPlace))
      : 0;
  const meta = await getEditionResultsMeta(editionId, db);
  const fullTotal =
    storage === "voices"
      ? (meta?.gotyTotalVoices ?? 0)
      : (meta?.gotyTotalCommunity ?? 0);
  const total = Math.max(0, fullTotal - afterPlace);
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const requested = Math.max(1, Math.floor(opts.page ?? 1));
  const page = Math.min(requested, totalPages);
  const offset = (page - 1) * pageSize;

  const conditions = [
    eq(communityEditionResultGoty.editionId, editionId),
    eq(communityEditionResultGoty.mode, storage),
  ];
  if (afterPlace > 0) {
    conditions.push(gt(communityEditionResultGoty.place, afterPlace));
  }

  const rows = await db
    .select()
    .from(communityEditionResultGoty)
    .where(and(...conditions))
    .orderBy(asc(communityEditionResultGoty.place))
    .limit(pageSize)
    .offset(offset);

  const mapped = rows.map((r) => ({
    place: r.place,
    gameId: r.gameId,
    slug: r.slug,
    title: r.title,
    year: r.gameYear,
    coverUrl: r.coverUrl,
    points: r.points,
    firstPlaceVotes: r.firstPlaceVotes,
    appearances: r.appearances,
  }));

  const rankMode = opts.rankMode ?? "competition";
  let firstGroupRank = 1;
  if (mapped[0]) {
    const firstPoints = mapped[0].points;
    const higherWhere = and(
      eq(communityEditionResultGoty.editionId, editionId),
      eq(communityEditionResultGoty.mode, storage),
      gt(communityEditionResultGoty.points, firstPoints),
    );
    if (rankMode === "dense") {
      const [row] = await db
        .select({
          n: sql<number>`count(distinct ${communityEditionResultGoty.points})::int`,
        })
        .from(communityEditionResultGoty)
        .where(higherWhere);
      firstGroupRank = Number(row?.n ?? 0) + 1;
    } else {
      const [row] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(communityEditionResultGoty)
        .where(higherWhere);
      firstGroupRank = Number(row?.n ?? 0) + 1;
    }
  }

  const ranked = withDisplayRanksOnPage(mapped, (r) => r.points, {
    offset: mapped[0] ? mapped[0].place - 1 : 0,
    firstGroupRank,
    mode: rankMode,
  });

  return {
    page,
    pageSize,
    total,
    totalPages,
    rows: ranked,
  };
}

/**
 * Every GOTY freeze row whose displayed rank is ≤ maxRank (default 10),
 * including the full tie at the cutoff. Not a board-order LIMIT — that
 * drops Voices (and Community) games that share rank 10 past the cap.
 */
export async function getEditionGotyThroughRank(
  editionId: string,
  mode: EditionResultMode,
  opts: { maxRank?: number; rankMode?: SharedRankMode } = {},
  db: Db = getDb(),
): Promise<EditionGotyStandingRow[]> {
  const storage = storageModeFor(mode);
  const maxRank = Math.max(1, Math.floor(opts.maxRank ?? BALLOT_MATRIX_TOP));
  const rankMode = opts.rankMode ?? "competition";

  const baseWhere = and(
    eq(communityEditionResultGoty.editionId, editionId),
    eq(communityEditionResultGoty.mode, storage),
  );

  let cutoffPoints: number | undefined;
  if (rankMode === "dense") {
    const distinct = await db
      .select({ points: communityEditionResultGoty.points })
      .from(communityEditionResultGoty)
      .where(baseWhere)
      .groupBy(communityEditionResultGoty.points)
      .orderBy(desc(communityEditionResultGoty.points))
      .limit(maxRank);
    if (distinct.length === 0) return [];
    cutoffPoints = distinct[distinct.length - 1]!.points;
  } else {
    const [nth] = await db
      .select({ points: communityEditionResultGoty.points })
      .from(communityEditionResultGoty)
      .where(baseWhere)
      .orderBy(asc(communityEditionResultGoty.place))
      .limit(1)
      .offset(maxRank - 1);
    if (nth) cutoffPoints = nth.points;
  }

  const rows = await db
    .select()
    .from(communityEditionResultGoty)
    .where(
      cutoffPoints != null
        ? and(
            baseWhere,
            gte(communityEditionResultGoty.points, cutoffPoints),
          )
        : baseWhere,
    )
    .orderBy(asc(communityEditionResultGoty.place));

  const mapped = rows.map((r) => ({
    place: r.place,
    gameId: r.gameId,
    slug: r.slug,
    title: r.title,
    year: r.gameYear,
    coverUrl: r.coverUrl,
    points: r.points,
    firstPlaceVotes: r.firstPlaceVotes,
    appearances: r.appearances,
  }));

  return withDisplayRanks(mapped, (r) => r.points, rankMode).filter(
    (r) => r.rank <= maxRank,
  );
}

/**
 * Every category freeze row whose displayed rank is ≤ maxRank, including
 * the full tie at the cutoff. Ranked Results uses 3; Comparison uses 1.
 * A `place <= N` cap (or loading only the first N board-order rows) drops
 * Voices ties that share #1–#3 past that place.
 *
 * Top-N uses a window `RANK` / `DENSE_RANK` (one pass) — not a correlated
 * subquery over the full tally per row.
 */
export async function getEditionCategoryResults(
  editionId: string,
  mode: EditionResultMode,
  opts: { maxRank?: number; rankMode?: SharedRankMode } = {},
  db: Db = getDb(),
): Promise<EditionCategoryStandingBlock[]> {
  const storage = storageModeFor(mode);
  const maxRank =
    opts.maxRank != null && Number.isFinite(opts.maxRank)
      ? Math.max(1, Math.floor(opts.maxRank))
      : null;
  const rankMode = opts.rankMode ?? "competition";

  const baseWhere = and(
    eq(communityEditionResultCategories.editionId, editionId),
    eq(communityEditionResultCategories.mode, storage),
  );

  type CategoryFreezeRow = {
    categoryId: string;
    label: string;
    description: string | null;
    sortOrder: number;
    place: number;
    gameId: string;
    slug: string;
    title: string;
    coverUrl: string | null;
    votes: number;
  };

  let mapped: CategoryFreezeRow[];

  if (maxRank == null) {
    const rows = await db
      .select({
        categoryId: communityEditionResultCategories.categoryId,
        label: communityEditionResultCategories.label,
        description: communityEditionResultCategories.description,
        sortOrder: communityEditionResultCategories.sortOrder,
        place: communityEditionResultCategories.place,
        gameId: communityEditionResultCategories.gameId,
        slug: communityEditionResultCategories.slug,
        title: communityEditionResultCategories.title,
        coverUrl: communityEditionResultCategories.coverUrl,
        votes: communityEditionResultCategories.votes,
      })
      .from(communityEditionResultCategories)
      .innerJoin(
        communityEditionCategories,
        and(
          eq(
            communityEditionCategories.editionId,
            communityEditionResultCategories.editionId,
          ),
          eq(
            communityEditionCategories.categoryId,
            communityEditionResultCategories.categoryId,
          ),
        ),
      )
      .where(baseWhere)
      .orderBy(
        asc(communityEditionResultCategories.sortOrder),
        asc(communityEditionResultCategories.place),
      );
    mapped = rows.map((row) => ({
      categoryId: row.categoryId,
      label: row.label,
      description: row.description,
      sortOrder: row.sortOrder,
      place: row.place,
      gameId: row.gameId,
      slug: row.slug,
      title: row.title,
      coverUrl: row.coverUrl,
      votes: row.votes,
    }));
  } else {
    const displayRankExpr =
      rankMode === "dense"
        ? sql`dense_rank() over (partition by r.category_id order by r.votes desc)`
        : sql`rank() over (partition by r.category_id order by r.votes desc)`;

    const result = await db.execute(sql`
      select
        category_id as "categoryId",
        label,
        description,
        sort_order as "sortOrder",
        place,
        game_id as "gameId",
        slug,
        title,
        cover_url as "coverUrl",
        votes
      from (
        select
          r.category_id,
          r.label,
          r.description,
          r.sort_order,
          r.place,
          r.game_id,
          r.slug,
          r.title,
          r.cover_url,
          r.votes,
          ${displayRankExpr} as display_rank
        from community_edition_result_categories r
        inner join community_edition_categories cec
          on cec.edition_id = r.edition_id
         and cec.category_id = r.category_id
        where r.edition_id = ${editionId}
          and r.mode = ${storage}
      ) ranked
      where display_rank <= ${maxRank}
      order by sort_order asc, place asc
    `);

    const rawRows = (
      Array.isArray(result)
        ? result
        : ((result as { rows?: unknown }).rows ?? [])
    ) as Array<Record<string, unknown>>;

    mapped = rawRows.map((row) => ({
      categoryId: String(row.categoryId),
      label: String(row.label),
      description:
        row.description == null ? null : String(row.description),
      sortOrder: Number(row.sortOrder),
      place: Number(row.place),
      gameId: String(row.gameId),
      slug: String(row.slug),
      title: String(row.title),
      coverUrl: row.coverUrl == null ? null : String(row.coverUrl),
      votes: Number(row.votes),
    }));
  }

  const byId = new Map<string, EditionCategoryStandingBlock>();
  for (const row of mapped) {
    let block = byId.get(row.categoryId);
    if (!block) {
      block = {
        categoryId: row.categoryId,
        label: row.label,
        description: row.description,
        rows: [],
      };
      byId.set(row.categoryId, block);
    }
    block.rows.push({
      place: row.place,
      rank: row.place,
      gameId: row.gameId,
      slug: row.slug,
      title: row.title,
      coverUrl: row.coverUrl,
      votes: row.votes,
    });
  }
  return [...byId.values()].map((block) => {
    const ranked = withDisplayRanks(block.rows, (r) => r.votes, rankMode);
    return {
      ...block,
      rows:
        maxRank != null ? ranked.filter((r) => r.rank <= maxRank) : ranked,
    };
  });
}

export const CATEGORY_RANKED_TOP = 3;
export const CATEGORY_RESULTS_PAGE_SIZE = 10;

export type EditionCategoryMeta = {
  categoryId: string;
  label: string;
  description: string | null;
  sortOrder: number;
  total: number;
};

export async function listEditionCategoryMeta(
  editionId: string,
  mode: EditionResultMode,
  db: Db = getDb(),
): Promise<EditionCategoryMeta[]> {
  const storage = storageModeFor(mode);
  const rows = await db
    .select({
      categoryId: communityEditionResultCategories.categoryId,
      label: communityEditionResultCategories.label,
      description: communityEditionResultCategories.description,
      sortOrder: communityEditionResultCategories.sortOrder,
      total: sql<number>`count(*)::int`,
    })
    .from(communityEditionResultCategories)
    .innerJoin(
      communityEditionCategories,
      and(
        eq(
          communityEditionCategories.editionId,
          communityEditionResultCategories.editionId,
        ),
        eq(
          communityEditionCategories.categoryId,
          communityEditionResultCategories.categoryId,
        ),
      ),
    )
    .where(
      and(
        eq(communityEditionResultCategories.editionId, editionId),
        eq(communityEditionResultCategories.mode, storage),
      ),
    )
    .groupBy(
      communityEditionResultCategories.categoryId,
      communityEditionResultCategories.label,
      communityEditionResultCategories.description,
      communityEditionResultCategories.sortOrder,
    )
    .orderBy(asc(communityEditionResultCategories.sortOrder));

  return rows.map((r) => ({
    categoryId: r.categoryId,
    label: r.label,
    description: r.description,
    sortOrder: r.sortOrder,
    total: Number(r.total),
  }));
}

export type EditionCategoryStandingRow =
  EditionCategoryStandingBlock["rows"][number];

export async function getEditionCategoryPage(
  editionId: string,
  mode: EditionResultMode,
  categoryId: string,
  opts: { page?: number; pageSize?: number; rankMode?: SharedRankMode } = {},
  db: Db = getDb(),
): Promise<{
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  rows: EditionCategoryStandingRow[];
}> {
  const storage = storageModeFor(mode);
  const pageSize = Math.min(
    50,
    Math.max(1, Math.floor(opts.pageSize ?? CATEGORY_RESULTS_PAGE_SIZE)),
  );

  const enabledIds = await listEditionEnabledCategoryIds(editionId, db);
  if (!enabledIds.includes(categoryId)) {
    return {
      page: 1,
      pageSize,
      total: 0,
      totalPages: 1,
      rows: [],
    };
  }

  const [countRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(communityEditionResultCategories)
    .where(
      and(
        eq(communityEditionResultCategories.editionId, editionId),
        eq(communityEditionResultCategories.mode, storage),
        eq(communityEditionResultCategories.categoryId, categoryId),
      ),
    );
  const total = Number(countRow?.n ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const requested = Math.max(1, Math.floor(opts.page ?? 1));
  const page = Math.min(requested, totalPages);
  const offset = (page - 1) * pageSize;

  const rows = await db
    .select()
    .from(communityEditionResultCategories)
    .where(
      and(
        eq(communityEditionResultCategories.editionId, editionId),
        eq(communityEditionResultCategories.mode, storage),
        eq(communityEditionResultCategories.categoryId, categoryId),
      ),
    )
    .orderBy(asc(communityEditionResultCategories.place))
    .limit(pageSize)
    .offset(offset);

  const mapped = rows.map((r) => ({
    place: r.place,
    gameId: r.gameId,
    slug: r.slug,
    title: r.title,
    coverUrl: r.coverUrl,
    votes: r.votes,
  }));

  const rankMode = opts.rankMode ?? "competition";
  let firstGroupRank = 1;
  if (mapped[0]) {
    const firstVotes = mapped[0].votes;
    const higherWhere = and(
      eq(communityEditionResultCategories.editionId, editionId),
      eq(communityEditionResultCategories.mode, storage),
      eq(communityEditionResultCategories.categoryId, categoryId),
      gt(communityEditionResultCategories.votes, firstVotes),
    );
    if (rankMode === "dense") {
      const [row] = await db
        .select({
          n: sql<number>`count(distinct ${communityEditionResultCategories.votes})::int`,
        })
        .from(communityEditionResultCategories)
        .where(higherWhere);
      firstGroupRank = Number(row?.n ?? 0) + 1;
    } else {
      const [row] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(communityEditionResultCategories)
        .where(higherWhere);
      firstGroupRank = Number(row?.n ?? 0) + 1;
    }
  }

  const ranked = withDisplayRanksOnPage(mapped, (r) => r.votes, {
    offset: mapped[0] ? mapped[0].place - 1 : 0,
    firstGroupRank,
    mode: rankMode,
  });

  return {
    page,
    pageSize,
    total,
    totalPages,
    rows: ranked,
  };
}

export async function getEditionVotersPage(
  editionId: string,
  opts: {
    page?: number;
    pageSize?: number;
    q?: string;
    voicesOnly?: boolean;
  } = {},
  db: Db = getDb(),
): Promise<{
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  rows: EditionVoterListRow[];
}> {
  const pageSize = Math.min(
    200,
    Math.max(1, Math.floor(opts.pageSize ?? STANDINGS_PAGE_SIZE)),
  );
  const q = opts.q?.trim() ?? "";

  const conditions = [eq(communityEditionResultVoters.editionId, editionId)];
  if (opts.voicesOnly) {
    conditions.push(eq(communityEditionResultVoters.isVoice, true));
  }
  if (q.length >= 1) {
    conditions.push(
      sql`(${communityEditionResultVoters.displayName} ILIKE ${`%${q}%`} OR ${communityEditionResultVoters.username} ILIKE ${`%${q}%`})`,
    );
  }

  const where = and(...conditions);

  const [countRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(communityEditionResultVoters)
    .where(where);
  const total = Number(countRow?.n ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const requested = Math.max(1, Math.floor(opts.page ?? 1));
  const page = Math.min(requested, totalPages);
  const offset = (page - 1) * pageSize;

  const rows = await db
    .select({
      profileId: communityEditionResultVoters.profileId,
      displayName: communityEditionResultVoters.displayName,
      username: communityEditionResultVoters.username,
      isVoice: communityEditionResultVoters.isVoice,
    })
    .from(communityEditionResultVoters)
    .where(where)
    .orderBy(
      asc(communityEditionResultVoters.displayName),
      asc(communityEditionResultVoters.username),
    )
    .limit(pageSize)
    .offset(offset);

  return { page, pageSize, total, totalPages, rows };
}

export type EditionBallotMatrix = {
  showYou: boolean;
  hasGames: boolean;
  voiceColumns: MatrixVoiceColumn[];
  /** Official edition numbering (competition skip or dense). */
  rows: EditionBallotMatrixRow[];
};

/**
 * Parallel top-10 GOTY lists: rank rows × You / Community / Voices / each Voice.
 * Community and Voices each load every freeze row with displayed rank ≤ 10
 * (full ties), not the first N board-order places.
 *
 * Optional preloads avoid re-fetching boards / Host columns when building
 * Comparison together with category matrices.
 */
export async function getEditionBallotMatrix(
  editionId: string,
  opts: {
    viewerProfileId?: string | null;
    rankMode?: SharedRankMode;
    communityRows?: EditionGotyStandingRow[];
    voicesRows?: EditionGotyStandingRow[];
    voiceColumns?: MatrixVoiceColumn[];
    showYou?: boolean;
    voterRanks?: Array<BallotVoterGameRow & { rank: number }>;
  } = {},
  db: Db = getDb(),
): Promise<EditionBallotMatrix> {
  const rankMode = opts.rankMode ?? "competition";
  const viewerProfileId = opts.viewerProfileId ?? null;

  const [communityRows, voicesRows, voiceColumns] = await Promise.all([
    opts.communityRows
      ? Promise.resolve(opts.communityRows)
      : getEditionGotyThroughRank(
          editionId,
          "community",
          { maxRank: BALLOT_MATRIX_TOP, rankMode },
          db,
        ),
    opts.voicesRows
      ? Promise.resolve(opts.voicesRows)
      : getEditionGotyThroughRank(
          editionId,
          "voices",
          { maxRank: BALLOT_MATRIX_TOP, rankMode },
          db,
        ),
    opts.voiceColumns
      ? Promise.resolve(opts.voiceColumns)
      : listEditionResultVoiceColumns(editionId, db),
  ]);

  const showYou =
    opts.showYou ??
    (await editionViewerIsOnRoster(editionId, viewerProfileId, db));

  const profileIdsForRanks = [
    ...voiceColumns.map((v) => v.profileId),
    ...(showYou && viewerProfileId ? [viewerProfileId] : []),
  ];
  const uniqueProfileIds = [...new Set(profileIdsForRanks)];

  let voterRanks = opts.voterRanks;
  if (voterRanks == null) {
    voterRanks =
      uniqueProfileIds.length > 0
        ? await loadBallotVoterRanks(editionId, uniqueProfileIds, db)
        : [];
  }

  const rows = assembleBallotMatrixRows({
    community: communityRows.map((r) => ({
      place: r.place,
      points: r.points,
      gameId: r.gameId,
      slug: r.slug,
      title: r.title,
      coverUrl: r.coverUrl,
    })),
    voices: voicesRows.map((r) => ({
      place: r.place,
      points: r.points,
      gameId: r.gameId,
      slug: r.slug,
      title: r.title,
      coverUrl: r.coverUrl,
    })),
    voiceColumns,
    voterRanks,
    viewerProfileId,
    includeYou: showYou,
    tieMode: rankMode === "dense" ? "dense" : "competition",
  });

  return {
    showYou,
    hasGames: matrixHasAnyGames(rows),
    voiceColumns,
    rows,
  };
}

export type EditionCategoryComparisonMatrix = {
  showYou: boolean;
  hasGames: boolean;
  voiceColumns: MatrixVoiceColumn[];
  rows: EditionCategoryComparisonRow[];
};

function winnersByCategory(
  blocks: EditionCategoryStandingBlock[],
): Record<string, MatrixGameCell[]> {
  const out: Record<string, MatrixGameCell[]> = {};
  for (const block of blocks) {
    out[block.categoryId] = block.rows
      .filter((r) => r.rank === 1)
      .map((top) => ({
        gameId: top.gameId,
        slug: top.slug,
        title: top.title,
        coverUrl: top.coverUrl,
      }));
  }
  return out;
}

async function listEditionResultVoiceColumns(
  editionId: string,
  db: Db,
): Promise<MatrixVoiceColumn[]> {
  return db
    .select({
      profileId: communityEditionResultVoters.profileId,
      displayName: communityEditionResultVoters.displayName,
      username: communityEditionResultVoters.username,
    })
    .from(communityEditionResultVoters)
    .where(
      and(
        eq(communityEditionResultVoters.editionId, editionId),
        eq(communityEditionResultVoters.isVoice, true),
      ),
    )
    .orderBy(
      asc(communityEditionResultVoters.displayName),
      asc(communityEditionResultVoters.username),
    );
}

async function editionViewerIsOnRoster(
  editionId: string,
  viewerProfileId: string | null,
  db: Db,
): Promise<boolean> {
  if (!viewerProfileId) return false;
  const [viewerRow] = await db
    .select({ profileId: communityEditionResultVoters.profileId })
    .from(communityEditionResultVoters)
    .where(
      and(
        eq(communityEditionResultVoters.editionId, editionId),
        eq(communityEditionResultVoters.profileId, viewerProfileId),
      ),
    )
    .limit(1);
  return Boolean(viewerRow);
}

/**
 * Award rows × You / Community (#1) / Voices (#1) / each Voice pick.
 * Displayed rank ≤ 1 per award (full ties) — not full category tallies.
 */
export async function getEditionCategoryComparisonMatrix(
  editionId: string,
  opts: {
    viewerProfileId?: string | null;
    rankMode?: SharedRankMode;
    communityBlocks?: EditionCategoryStandingBlock[];
    voicesBlocks?: EditionCategoryStandingBlock[];
    voiceColumns?: MatrixVoiceColumn[];
    showYou?: boolean;
    picks?: Array<BallotVoterGameRow & { categoryId: string }>;
  } = {},
  db: Db = getDb(),
): Promise<EditionCategoryComparisonMatrix> {
  const rankMode = opts.rankMode ?? "competition";
  const viewerProfileId = opts.viewerProfileId ?? null;

  const [communityBlocks, voicesBlocks, voiceColumns] = await Promise.all([
    opts.communityBlocks
      ? Promise.resolve(opts.communityBlocks)
      : getEditionCategoryResults(
          editionId,
          "community",
          { maxRank: 1, rankMode },
          db,
        ),
    opts.voicesBlocks
      ? Promise.resolve(opts.voicesBlocks)
      : getEditionCategoryResults(
          editionId,
          "voices",
          { maxRank: 1, rankMode },
          db,
        ),
    opts.voiceColumns
      ? Promise.resolve(opts.voiceColumns)
      : listEditionResultVoiceColumns(editionId, db),
  ]);

  const categoryOrder = new Map<string, { categoryId: string; label: string }>();
  for (const block of communityBlocks) {
    categoryOrder.set(block.categoryId, {
      categoryId: block.categoryId,
      label: block.label,
    });
  }
  for (const block of voicesBlocks) {
    if (!categoryOrder.has(block.categoryId)) {
      categoryOrder.set(block.categoryId, {
        categoryId: block.categoryId,
        label: block.label,
      });
    }
  }
  const categories = [...categoryOrder.values()];

  const showYou =
    opts.showYou ??
    (await editionViewerIsOnRoster(editionId, viewerProfileId, db));

  const profileIds = [
    ...voiceColumns.map((v) => v.profileId),
    ...(showYou && viewerProfileId ? [viewerProfileId] : []),
  ];
  const uniqueProfileIds = [...new Set(profileIds)];

  let picks = opts.picks;
  if (picks == null) {
    picks =
      uniqueProfileIds.length > 0 && categories.length > 0
        ? await loadBallotVoterCategoryPicks(
            editionId,
            uniqueProfileIds,
            db,
          )
        : [];
  }

  const rows = assembleCategoryComparisonRows({
    categories,
    communityByCategory: winnersByCategory(communityBlocks),
    voicesByCategory: winnersByCategory(voicesBlocks),
    picks,
    voiceColumns,
    viewerProfileId,
    includeYou: showYou,
  });

  return {
    showYou,
    hasGames: categoryComparisonHasGames(rows),
    voiceColumns,
    rows,
  };
}

/**
 * One Comparison payload: shared Host columns, shared You check, GOTY +
 * category boards fetched once each (no duplicate through-rank calls).
 */
export async function getEditionComparisonBundle(
  editionId: string,
  opts: {
    viewerProfileId?: string | null;
    rankMode?: SharedRankMode;
  } = {},
  db: Db = getDb(),
): Promise<{
  matrix: EditionBallotMatrix;
  categoryComparison: EditionCategoryComparisonMatrix;
}> {
  const rankMode = opts.rankMode ?? "competition";
  const viewerProfileId = opts.viewerProfileId ?? null;

  const [
    communityRows,
    voicesRows,
    communityBlocks,
    voicesBlocks,
    voiceColumns,
  ] = await Promise.all([
    getEditionGotyThroughRank(
      editionId,
      "community",
      { maxRank: BALLOT_MATRIX_TOP, rankMode },
      db,
    ),
    getEditionGotyThroughRank(
      editionId,
      "voices",
      { maxRank: BALLOT_MATRIX_TOP, rankMode },
      db,
    ),
    getEditionCategoryResults(
      editionId,
      "community",
      { maxRank: 1, rankMode },
      db,
    ),
    getEditionCategoryResults(
      editionId,
      "voices",
      { maxRank: 1, rankMode },
      db,
    ),
    listEditionResultVoiceColumns(editionId, db),
  ]);

  const showYou = await editionViewerIsOnRoster(
    editionId,
    viewerProfileId,
    db,
  );

  const profileIds = [
    ...voiceColumns.map((v) => v.profileId),
    ...(showYou && viewerProfileId ? [viewerProfileId] : []),
  ];
  const uniqueProfileIds = [...new Set(profileIds)];

  const [voterRanks, picks] = await Promise.all([
    uniqueProfileIds.length > 0
      ? loadBallotVoterRanks(editionId, uniqueProfileIds, db)
      : Promise.resolve([]),
    uniqueProfileIds.length > 0
      ? loadBallotVoterCategoryPicks(editionId, uniqueProfileIds, db)
      : Promise.resolve([]),
  ]);

  const [matrix, categoryComparison] = await Promise.all([
    getEditionBallotMatrix(
      editionId,
      {
        viewerProfileId,
        rankMode,
        communityRows,
        voicesRows,
        voiceColumns,
        showYou,
        voterRanks,
      },
      db,
    ),
    getEditionCategoryComparisonMatrix(
      editionId,
      {
        viewerProfileId,
        rankMode,
        communityBlocks,
        voicesBlocks,
        voiceColumns,
        showYou,
        picks,
      },
      db,
    ),
  ]);

  return { matrix, categoryComparison };
}

export async function getEditionVoterDetail(
  editionId: string,
  profileId: string,
  db: Db = getDb(),
): Promise<{
  voter: EditionVoterListRow;
  ranks: Array<{
    rank: number;
    gameId: string;
    slug: string;
    title: string;
    coverUrl: string | null;
  }>;
  categoryPicks: Array<{
    categoryId: string;
    gameId: string;
    slug: string;
    title: string;
    coverUrl: string | null;
  }>;
} | null> {
  const [voter] = await db
    .select()
    .from(communityEditionResultVoters)
    .where(
      and(
        eq(communityEditionResultVoters.editionId, editionId),
        eq(communityEditionResultVoters.profileId, profileId),
      ),
    )
    .limit(1);
  if (!voter) return null;

  const [ranks, categoryPicks] = await Promise.all([
    loadBallotVoterRanks(editionId, [profileId], db),
    loadBallotVoterCategoryPicks(editionId, [profileId], db),
  ]);

  return {
    voter: {
      profileId: voter.profileId,
      displayName: voter.displayName,
      username: voter.username,
      isVoice: voter.isVoice,
    },
    ranks: ranks.map((r) => ({
      rank: r.rank,
      gameId: r.gameId,
      slug: r.slug,
      title: r.title,
      coverUrl: r.coverUrl,
    })),
    categoryPicks: categoryPicks.map((r) => ({
      categoryId: r.categoryId,
      gameId: r.gameId,
      slug: r.slug,
      title: r.title,
      coverUrl: r.coverUrl,
    })),
  };
}

/** Public frozen ballot lookup by username (case-insensitive). */
export async function getEditionVoterDetailByUsername(
  editionId: string,
  username: string,
  db: Db = getDb(),
): Promise<Awaited<ReturnType<typeof getEditionVoterDetail>>> {
  const needle = username.trim();
  if (!needle) return null;

  const [voter] = await db
    .select({ profileId: communityEditionResultVoters.profileId })
    .from(communityEditionResultVoters)
    .where(
      and(
        eq(communityEditionResultVoters.editionId, editionId),
        sql`lower(${communityEditionResultVoters.username}) = ${needle.toLowerCase()}`,
      ),
    )
    .limit(1);

  if (!voter) return null;
  return getEditionVoterDetail(editionId, voter.profileId, db);
}
