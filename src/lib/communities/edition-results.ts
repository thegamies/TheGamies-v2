import { and, asc, eq, gt, gte, inArray, sql } from "drizzle-orm";
import {
  communityCustomCategories,
  communityCustomCategoryEntries,
  communityEditionBallotCategoryVotes,
  communityEditionBallotCustomCategoryVotes,
  communityEditionBallotItems,
  communityEditionBallots,
  communityEditionCategories,
  communityEditionResultCategories,
  communityEditionResultCustomCategories,
  communityEditionResultGoty,
  communityEditionResultMeta,
  communityEditionResultVoterCategoryPicks,
  communityEditionResultVoterRanks,
  communityEditionResultVoters,
  communityEditions,
  covers,
  createDb,
  games,
  profiles,
  type Db,
} from "@thegamies/db";
import {
  customResultDisplayTitle,
  customResultTallyKind,
} from "@/lib/communities/custom-category-types";
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
  storageModeFor,
  type EditionResultMode,
} from "./edition-results-scoring";
import { loadEditionCategorySnapshot } from "@/lib/communities/edition-category-snapshot";
import {
  withDisplayRanks,
  withDisplayRanksOnPage,
  type SharedRankMode,
} from "@/lib/standings/shared-rank";
import {
  backfillCustomCategoryFreeze,
  rewriteEditionHostsSnapshot,
  writeEditionFreezeSnapshot,
} from "./edition-freeze-sql";
import {
  getEditionByCommunityYear,
  type CommunityEditionPublic,
} from "./editions";

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
  /** Community-created award (not a site catalog category). */
  isCommunity?: boolean;
  rows: Array<{
    place: number;
    rank: number;
    gameId: string;
    slug: string;
    title: string;
    subtitle?: string | null;
    coverUrl: string | null;
    votes: number;
    supportLinkUrl?: string | null;
  }>;
};

export type EditionVoterListRow = {
  profileId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  isVoice: boolean;
};

export type EditionResultsMeta = {
  frozenAt: Date;
  ballotCountCommunity: number;
  ballotCountVoices: number;
  gotyTotalCommunity: number;
  gotyTotalVoices: number;
  /**
   * True when a custom-award backfill would insert nothing: rows are already
   * stored, or this edition has no community awards to freeze.
   * Absent on a just-written freeze row; the next meta read fills it in.
   */
  customAwardsSettled?: boolean;
};

export async function getEditionResultsMeta(
  editionId: string,
  db: Db = getDb(),
): Promise<EditionResultsMeta | null> {
  const [row] = await db
    .select({
      frozenAt: communityEditionResultMeta.frozenAt,
      ballotCountCommunity: communityEditionResultMeta.ballotCountCommunity,
      ballotCountVoices: communityEditionResultMeta.ballotCountVoices,
      gotyTotalCommunity: communityEditionResultMeta.gotyTotalCommunity,
      gotyTotalVoices: communityEditionResultMeta.gotyTotalVoices,
      customAwardsSettled: sql<boolean>`(
        exists (
          select 1 from community_edition_result_custom_categories
          where edition_id = ${editionId}
        )
        or not exists (
          select 1 from community_custom_categories
          where edition_id = ${editionId}
        )
      )`,
    })
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
    customAwardsSettled: Boolean(row.customAwardsSettled),
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
  return freezeEditionResults(editionId, db, { replace: false });
}

/**
 * Replace the snapshot with one from current ballots, atomically: readers see
 * the old results until the new ones commit, and a failure keeps the old ones.
 */
export async function rebuildEditionResultsFrozen(
  editionId: string,
  db: Db = getDb(),
): Promise<EditionResultsMeta | { error: string }> {
  return freezeEditionResults(editionId, db, { replace: true });
}

/**
 * Rebuild Hosts freeze rows only. Community freeze stays write-once.
 * No-op when this edition has not been frozen yet.
 */
export async function rebuildEditionHostsResultsFrozen(
  editionId: string,
  db: Db = getDb(),
): Promise<EditionResultsMeta | { ok: true } | { error: string }> {
  const existing = await getEditionResultsMeta(editionId, db);
  if (!existing) return { ok: true };
  try {
    return (await rewriteEditionHostsSnapshot(editionId, db)) ?? existing;
  } catch (err) {
    const detail =
      err instanceof Error ? err.message : "Could not rebuild Hosts results.";
    return { error: detail };
  }
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
    .delete(communityEditionResultCustomCategories)
    .where(eq(communityEditionResultCustomCategories.editionId, editionId));
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

type BallotRankRow = {
  profileId: string;
  rank: number;
  gameId: string;
  slug: string;
  title: string;
  coverImageId: string | null;
};

function ballotVoterRankQuery(db: Db, editionId: string, profileIds: string[]) {
  return db
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
}

function mapBallotVoterRanks(rows: BallotRankRow[]) {
  return rows.map((r) => ({
    profileId: r.profileId,
    rank: r.rank,
    gameId: r.gameId,
    slug: r.slug,
    title: r.title,
    coverUrl: coverUrlFrom(r.coverImageId),
  }));
}

/** GOTY ranks from ballot tables (not freeze copies). Closed/published ballots stay after account tombstone so Comparison host columns remain. */
async function loadBallotVoterRanks(
  editionId: string,
  profileIds: string[],
  db: Db,
): Promise<Array<BallotVoterGameRow & { rank: number }>> {
  if (profileIds.length === 0) return [];
  return mapBallotVoterRanks(
    await ballotVoterRankQuery(db, editionId, profileIds),
  );
}

type BallotCategoryPickRow = {
  profileId: string;
  categoryId: string;
  gameId: string;
  slug: string;
  title: string;
  coverImageId: string | null;
};

function ballotVoterCategoryPickQuery(
  db: Db,
  editionId: string,
  profileIds: string[],
) {
  return db
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
}

function mapBallotVoterCategoryPicks(rows: BallotCategoryPickRow[]) {
  return rows.map((r) => ({
    profileId: r.profileId,
    categoryId: r.categoryId,
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
  return mapBallotVoterCategoryPicks(
    await ballotVoterCategoryPickQuery(db, editionId, profileIds),
  );
}

type BallotCustomPickRow = {
  profileId: string;
  categoryId: string;
  gameId: string | null;
  entryId: string | null;
  entryTitle: string | null;
  entryImageUrl: string | null;
  supportLinkUrl: string | null;
  gameTitle: string | null;
  gameSlug: string | null;
  resolvedGameId: string | null;
  coverImageId: string | null;
};

function ballotVoterCustomPickQuery(
  db: Db,
  editionId: string,
  profileIds: string[],
) {
  return db
    .select({
      profileId: communityEditionBallots.profileId,
      categoryId: communityEditionBallotCustomCategoryVotes.categoryId,
      gameId: communityEditionBallotCustomCategoryVotes.gameId,
      entryId: communityEditionBallotCustomCategoryVotes.entryId,
      entryTitle: communityCustomCategoryEntries.title,
      entryImageUrl: communityCustomCategoryEntries.imageUrl,
      supportLinkUrl: communityCustomCategoryEntries.supportLinkUrl,
      gameTitle: games.title,
      gameSlug: games.slug,
      resolvedGameId: games.id,
      coverImageId: covers.imageId,
    })
    .from(communityEditionBallotCustomCategoryVotes)
    .innerJoin(
      communityEditionBallots,
      eq(
        communityEditionBallots.id,
        communityEditionBallotCustomCategoryVotes.ballotId,
      ),
    )
    .innerJoin(
      communityCustomCategories,
      and(
        eq(
          communityCustomCategories.id,
          communityEditionBallotCustomCategoryVotes.categoryId,
        ),
        eq(communityCustomCategories.editionId, editionId),
      ),
    )
    .leftJoin(
      communityCustomCategoryEntries,
      eq(
        communityCustomCategoryEntries.id,
        communityEditionBallotCustomCategoryVotes.entryId,
      ),
    )
    .leftJoin(
      games,
      eq(
        games.id,
        sql`coalesce(${communityEditionBallotCustomCategoryVotes.gameId}, ${communityCustomCategoryEntries.gameId})`,
      ),
    )
    .leftJoin(covers, eq(covers.igdbId, games.coverIgdbId))
    .where(
      and(
        eq(communityEditionBallots.editionId, editionId),
        inArray(communityEditionBallots.profileId, profileIds),
      ),
    );
}

function mapBallotVoterCustomPicks(rows: BallotCustomPickRow[]) {
  return rows.map((r) => {
    const isEntry = Boolean(r.entryId);
    return {
      profileId: r.profileId,
      categoryId: r.categoryId,
      gameId: r.gameId ?? r.resolvedGameId,
      entryId: r.entryId,
      title: isEntry ? (r.entryTitle ?? "Entry") : (r.gameTitle ?? "Game"),
      subtitle: isEntry && r.gameTitle ? r.gameTitle : null,
      imageUrl: r.entryImageUrl,
      coverUrl: coverUrlFrom(r.coverImageId),
      slug: r.gameSlug,
      supportLinkUrl: r.supportLinkUrl,
    };
  });
}

async function loadBallotVoterCustomCategoryPicks(
  editionId: string,
  profileIds: string[],
  db: Db,
): Promise<ReturnType<typeof mapBallotVoterCustomPicks>> {
  if (profileIds.length === 0) return [];
  return mapBallotVoterCustomPicks(
    await ballotVoterCustomPickQuery(db, editionId, profileIds),
  );
}

function customPicksToComparisonLines(
  picks: Awaited<ReturnType<typeof loadBallotVoterCustomCategoryPicks>>,
): Array<BallotVoterGameRow & { categoryId: string }> {
  return picks.map((pick) => ({
    profileId: pick.profileId,
    categoryId: pick.categoryId,
    gameId: pick.gameId ?? pick.entryId ?? pick.categoryId,
    slug: pick.slug ?? "",
    title: customResultDisplayTitle(pick.title, pick.subtitle),
    coverUrl: pick.imageUrl || pick.coverUrl,
  }));
}

async function loadBallotCategoryComparisonPicks(
  editionId: string,
  profileIds: string[],
  db: Db,
): Promise<Array<BallotVoterGameRow & { categoryId: string }>> {
  if (profileIds.length === 0) return [];
  const [site, custom] = await Promise.all([
    loadBallotVoterCategoryPicks(editionId, profileIds, db),
    loadBallotVoterCustomCategoryPicks(editionId, profileIds, db),
  ]);
  return [...site, ...customPicksToComparisonLines(custom)];
}

/**
 * Write-once freeze can omit community awards if it ran before those votes
 * existed. Fill only the missing custom freeze slice � do not rebuild GOTY.
 */
export async function ensureCustomCategoryFreezeComplete(
  editionId: string,
  db: Db = getDb(),
): Promise<void> {
  try {
    await backfillCustomCategoryFreeze(editionId, db);
  } catch (err) {
    console.error("ensureCustomCategoryFreezeComplete failed", err);
  }
}

async function freezeEditionResults(
  editionId: string,
  db: Db,
  opts: { replace: boolean },
): Promise<EditionResultsMeta | { error: string }> {
  if (!opts.replace) {
    const existing = await getEditionResultsMeta(editionId, db);
    if (existing) return existing;
  }

  try {
    return await writeEditionFreezeSnapshot(editionId, db, {
      replaceMeta: opts.replace,
    });
  } catch (err) {
    // The transaction rolled back. A first freeze that lost a race finds the
    // winner's snapshot; a failed rebuild keeps the previous one.
    if (!opts.replace) {
      const raced = await getEditionResultsMeta(editionId, db).catch(() => null);
      if (raced) return raced;
    }
    const detail =
      err instanceof Error ? err.message : "Could not freeze edition results.";
    return { error: detail };
  }
}

/**
 * Same as {@link ensurePublishedEditionResults} when the edition row is
 * already loaded — skip a second year lookup.
 */
export async function ensurePublishedEditionResultsForEdition(
  edition: Pick<
    CommunityEditionPublic,
    "id" | "status" | "freezeStatus" | "opensAt" | "closesAt" | "publishesAt"
  >,
  db: Db = getDb(),
): Promise<EditionResultsMeta | null | { error: string }> {
  if (edition.status !== "published" && edition.status !== "closed") {
    return null;
  }

  const existing = await getEditionResultsMeta(edition.id, db);
  if (existing) {
    if (edition.freezeStatus !== "ready") {
      const { markEditionFreezeReady } = await import("./edition-freeze");
      await markEditionFreezeReady(edition.id, db);
    }
    if (existing.customAwardsSettled !== true) {
      await ensureCustomCategoryFreezeComplete(edition.id, db);
    }
    return existing;
  }

  const { maybeKickEditionFreeze } = await import("./edition-freeze");
  await maybeKickEditionFreeze(edition, {}, db);
  return null;
}

/** Public ensure: kick freeze when published; return meta if ready (non-blocking). */
export async function ensurePublishedEditionResults(
  communityId: string,
  year: number,
  db: Db = getDb(),
): Promise<EditionResultsMeta | null | { error: string }> {
  const edition = await getEditionByCommunityYear(communityId, year, db);
  if (!edition) return null;
  return ensurePublishedEditionResultsForEdition(edition, db);
}

export async function getEditionGotyPage(
  editionId: string,
  mode: EditionResultMode,
  opts: {
    page?: number;
    pageSize?: number;
    afterPlace?: number;
    rankMode?: SharedRankMode;
    meta?: EditionResultsMeta | null;
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
  const meta =
    opts.meta !== undefined
      ? opts.meta
      : await getEditionResultsMeta(editionId, db);
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
  // Place 1 is the top of the board, so nothing outranks it. Later pages
  // still count higher scores so the numbers continue.
  if (mapped[0] && mapped[0].place > 1) {
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
 *
 * Top-N uses a window `RANK` / `DENSE_RANK` (one pass) — same pattern as
 * category podiums. Neon HTTP is one round trip per query.
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
  const displayRankExpr =
    rankMode === "dense"
      ? sql`dense_rank() over (order by r.points desc)`
      : sql`rank() over (order by r.points desc)`;

  const result = await db.execute(sql`
    select
      place,
      game_id as "gameId",
      slug,
      title,
      game_year as "year",
      cover_url as "coverUrl",
      points,
      first_place_votes as "firstPlaceVotes",
      appearances
    from (
      select
        r.place,
        r.game_id,
        r.slug,
        r.title,
        r.game_year,
        r.cover_url,
        r.points,
        r.first_place_votes,
        r.appearances,
        ${displayRankExpr} as display_rank
      from community_edition_result_goty r
      where r.edition_id = ${editionId}
        and r.mode = ${storage}
    ) ranked
    where display_rank <= ${maxRank}
    order by place asc
  `);

  const rawRows = (
    Array.isArray(result)
      ? result
      : ((result as { rows?: unknown }).rows ?? [])
  ) as Array<Record<string, unknown>>;

  const mapped = rawRows.map((row) => ({
    place: Number(row.place),
    gameId: String(row.gameId),
    slug: String(row.slug),
    title: String(row.title),
    year: row.year == null ? null : Number(row.year),
    coverUrl: row.coverUrl == null ? null : String(row.coverUrl),
    points: Number(row.points),
    firstPlaceVotes: Number(row.firstPlaceVotes),
    appearances: Number(row.appearances),
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
  opts: {
    maxRank?: number;
    rankMode?: SharedRankMode;
    skipCustomBackfill?: boolean;
  } = {},
  db: Db = getDb(),
): Promise<EditionCategoryStandingBlock[]> {
  if (!opts.skipCustomBackfill) {
    await ensureCustomCategoryFreezeComplete(editionId, db);
  }
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

  const byId = new Map<
    string,
    EditionCategoryStandingBlock & { sortOrder: number }
  >();
  for (const row of mapped) {
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
      rank: row.place,
      gameId: row.gameId,
      slug: row.slug,
      title: row.title,
      coverUrl: row.coverUrl,
      votes: row.votes,
    });
  }
  const siteBlocks = [...byId.values()].map((block) => {
    const ranked = withDisplayRanks(block.rows, (r) => r.votes, rankMode);
    return {
      ...block,
      rows:
        maxRank != null ? ranked.filter((r) => r.rank <= maxRank) : ranked,
    };
  });

  const customRows = await db
    .select()
    .from(communityEditionResultCustomCategories)
    .where(
      and(
        eq(communityEditionResultCustomCategories.editionId, editionId),
        eq(communityEditionResultCustomCategories.mode, storage),
      ),
    )
    .orderBy(
      asc(communityEditionResultCustomCategories.sortOrder),
      asc(communityEditionResultCustomCategories.place),
    );

  const customById = new Map<
    string,
    EditionCategoryStandingBlock & { sortOrder: number }
  >();
  for (const row of customRows) {
    let block = customById.get(row.categoryId);
    if (!block) {
      block = {
        categoryId: row.categoryId,
        label: `${row.label} · Community`,
        description: row.description,
        isCommunity: true,
        sortOrder: row.sortOrder,
        rows: [],
      };
      customById.set(row.categoryId, block);
    }
    block.rows.push({
      place: row.place,
      rank: row.place,
      gameId: row.gameId ?? row.entryId ?? row.categoryId,
      slug: row.slug ?? "",
      title: customResultDisplayTitle(row.title, row.subtitle),
      subtitle: row.subtitle,
      coverUrl: row.imageUrl || row.coverUrl,
      votes: row.votes,
      supportLinkUrl: row.supportLinkUrl,
    });
  }
  const customBlocks = [...customById.values()].map((block) => {
    const ranked = withDisplayRanks(block.rows, (r) => r.votes, rankMode);
    return {
      ...block,
      rows:
        maxRank != null ? ranked.filter((r) => r.rank <= maxRank) : ranked,
    };
  });

  return [...siteBlocks, ...customBlocks]
    .sort(
      (a, b) =>
        a.sortOrder - b.sortOrder ||
        a.categoryId.localeCompare(b.categoryId),
    )
    .map((row) => {
      const { sortOrder, ...block } = row;
      void sortOrder;
      return block;
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
  isCommunity?: boolean;
  tallyKind?: "game" | "entry";
};

export async function listEditionCategoryMeta(
  editionId: string,
  mode: EditionResultMode,
  db: Db = getDb(),
  opts: { skipCustomBackfill?: boolean } = {},
): Promise<EditionCategoryMeta[]> {
  if (!opts.skipCustomBackfill) {
    await ensureCustomCategoryFreezeComplete(editionId, db);
  }
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

  const siteMeta = rows.map((r) => ({
    categoryId: r.categoryId,
    label: r.label,
    description: r.description,
    sortOrder: r.sortOrder,
    total: Number(r.total),
  }));
  const customMeta = (
    await db
      .select({
        categoryId: communityEditionResultCustomCategories.categoryId,
        label: communityEditionResultCustomCategories.label,
        description: communityEditionResultCustomCategories.description,
        sortOrder: communityEditionResultCustomCategories.sortOrder,
        answerType: communityEditionResultCustomCategories.answerType,
        total: sql<number>`count(*)::int`,
      })
      .from(communityEditionResultCustomCategories)
      .where(
        and(
          eq(communityEditionResultCustomCategories.editionId, editionId),
          eq(communityEditionResultCustomCategories.mode, storage),
        ),
      )
      .groupBy(
        communityEditionResultCustomCategories.categoryId,
        communityEditionResultCustomCategories.label,
        communityEditionResultCustomCategories.description,
        communityEditionResultCustomCategories.sortOrder,
        communityEditionResultCustomCategories.answerType,
      )
      .orderBy(asc(communityEditionResultCustomCategories.sortOrder))
  ).map((r) => ({
    categoryId: r.categoryId,
    label: `${r.label} · Community`,
    description: r.description,
    sortOrder: r.sortOrder,
    total: Number(r.total),
    isCommunity: true,
    tallyKind: customResultTallyKind(r.answerType),
  }));

  return [...siteMeta, ...customMeta].sort(
    (a, b) =>
      a.sortOrder - b.sortOrder ||
      a.categoryId.localeCompare(b.categoryId),
  );
}

export type EditionCategoryStandingRow =
  EditionCategoryStandingBlock["rows"][number];

type CategoryBoardPageRow = {
  place: number;
  gameId: string;
  slug: string;
  title: string;
  subtitle: string | null;
  coverUrl: string | null;
  imageUrl: string | null;
  votes: number;
  supportLinkUrl: string | null;
};

/** One statement: the page of rows and the full total, including an empty board. */
async function readCategoryBoardPage(
  db: Db,
  input: {
    editionId: string;
    storage: "community" | "voices";
    categoryId: string;
    pageSize: number;
    requested: number;
    kind: "site" | "custom";
  },
): Promise<{ total: number; page: number; rows: CategoryBoardPageRow[] }> {
  const matched =
    input.kind === "site"
      ? sql`
        select
          r.place,
          r.game_id,
          r.slug,
          r.title,
          null::text as subtitle,
          r.cover_url,
          null::text as image_url,
          r.votes,
          null::text as support_link_url
        from community_edition_result_categories r
        inner join community_edition_categories cec
          on cec.edition_id = r.edition_id
         and cec.category_id = r.category_id
        where r.edition_id = ${input.editionId}
          and r.mode = ${input.storage}
          and r.category_id = ${input.categoryId}
      `
      : sql`
        select
          r.place,
          coalesce(r.game_id, r.entry_id, r.category_id) as game_id,
          coalesce(r.slug, '') as slug,
          r.title,
          r.subtitle,
          r.cover_url,
          r.image_url,
          r.votes,
          r.support_link_url
        from community_edition_result_custom_categories r
        where r.edition_id = ${input.editionId}
          and r.mode = ${input.storage}
          and r.category_id = ${input.categoryId}
      `;

  const result = await db.execute(sql`
    with matched as (
      ${matched}
    ),
    bounds as (
      select
        count(*)::int as total,
        greatest(1, ceil(count(*)::numeric / ${input.pageSize}))::int as total_pages
      from matched
    ),
    windowed as (
      select
        m.place,
        m.game_id,
        m.slug,
        m.title,
        m.subtitle,
        m.cover_url,
        m.image_url,
        m.votes,
        m.support_link_url,
        b.total,
        b.total_pages,
        row_number() over (order by m.place) as n
      from matched m
      cross join bounds b
    )
    select
      place,
      game_id as "gameId",
      slug,
      title,
      subtitle,
      cover_url as "coverUrl",
      image_url as "imageUrl",
      votes,
      support_link_url as "supportLinkUrl",
      total,
      total_pages as "totalPages"
    from windowed
    where n > (least(${input.requested}, total_pages) - 1) * ${input.pageSize}
      and n <= least(${input.requested}, total_pages) * ${input.pageSize}
    union all
    select
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      b.total,
      b.total_pages
    from bounds b
    where b.total = 0
  `);

  const rawRows = (
    Array.isArray(result)
      ? result
      : ((result as { rows?: unknown }).rows ?? [])
  ) as Array<Record<string, unknown>>;
  const total = Number(rawRows[0]?.total ?? 0);
  const totalPages = Math.max(1, Number(rawRows[0]?.totalPages ?? 1) || 1);
  const page = Math.min(input.requested, totalPages);
  const rows = rawRows
    .filter((row) => row.gameId != null)
    .map((row) => ({
      place: Number(row.place),
      gameId: String(row.gameId),
      slug: String(row.slug ?? ""),
      title: String(row.title ?? ""),
      subtitle: row.subtitle == null ? null : String(row.subtitle),
      coverUrl: row.coverUrl == null ? null : String(row.coverUrl),
      imageUrl: row.imageUrl == null ? null : String(row.imageUrl),
      votes: Number(row.votes),
      supportLinkUrl:
        row.supportLinkUrl == null ? null : String(row.supportLinkUrl),
    }));
  return { total, page, rows };
}

export async function getEditionCategoryPage(
  editionId: string,
  mode: EditionResultMode,
  categoryId: string,
  opts: {
    page?: number;
    pageSize?: number;
    rankMode?: SharedRankMode;
    skipCustomBackfill?: boolean;
  } = {},
  db: Db = getDb(),
): Promise<{
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  rows: EditionCategoryStandingRow[];
}> {
  if (!opts.skipCustomBackfill) {
    await ensureCustomCategoryFreezeComplete(editionId, db);
  }
  const storage = storageModeFor(mode);
  const pageSize = Math.min(
    50,
    Math.max(1, Math.floor(opts.pageSize ?? CATEGORY_RESULTS_PAGE_SIZE)),
  );

  const requested = Math.max(1, Math.floor(opts.page ?? 1));
  const siteBoard = await readCategoryBoardPage(db, {
    editionId,
    storage,
    categoryId,
    pageSize,
    requested,
    kind: "site",
  });
  const board =
    siteBoard.total > 0
      ? siteBoard
      : await readCategoryBoardPage(db, {
          editionId,
          storage,
          categoryId,
          pageSize,
          requested,
          kind: "custom",
        });
  const { total, page, rows } = board;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const mapped =
    siteBoard.total > 0
      ? rows.map((r) => ({
          place: r.place,
          gameId: r.gameId,
          slug: r.slug,
          title: r.title,
          coverUrl: r.coverUrl,
          votes: r.votes,
        }))
      : rows.map((r) => ({
          place: r.place,
          gameId: r.gameId,
          slug: r.slug,
          title: customResultDisplayTitle(r.title, r.subtitle),
          coverUrl: r.imageUrl || r.coverUrl,
          votes: r.votes,
          supportLinkUrl: r.supportLinkUrl,
        }));
  if (siteBoard.total === 0) {
    const rankMode = opts.rankMode ?? "competition";
    const ranked = withDisplayRanks(mapped, (r) => r.votes, rankMode);
    return { page, pageSize, total, totalPages, rows: ranked };
  }

  const rankMode = opts.rankMode ?? "competition";
  let firstGroupRank = 1;
  if (mapped[0] && mapped[0].place > 1) {
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
    /** Freeze ballot count. Skips the list count when the search box is empty. */
    knownTotal?: number;
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

  const knownTotal =
    q.length < 1 &&
    opts.knownTotal != null &&
    Number.isFinite(opts.knownTotal)
      ? Math.max(0, Math.floor(opts.knownTotal))
      : null;
  const [countRow] = knownTotal != null
    ? [null]
    : await db
        .select({ n: sql<number>`count(*)::int` })
        .from(communityEditionResultVoters)
        .where(where);
  const total = knownTotal ?? Number(countRow?.n ?? 0);
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
      avatarUrl: profiles.avatarUrl,
    })
    .from(communityEditionResultVoters)
    .leftJoin(
      profiles,
      eq(profiles.id, communityEditionResultVoters.profileId),
    )
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
      avatarUrl: profiles.avatarUrl,
    })
    .from(communityEditionResultVoters)
    .leftJoin(
      profiles,
      eq(profiles.id, communityEditionResultVoters.profileId),
    )
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
        ? await loadBallotCategoryComparisonPicks(
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
    /** Page already ran the freeze backfill. */
    skipCustomBackfill?: boolean;
  } = {},
  db: Db = getDb(),
): Promise<{
  matrix: EditionBallotMatrix;
  categoryComparison: EditionCategoryComparisonMatrix;
}> {
  const rankMode = opts.rankMode ?? "competition";
  const viewerProfileId = opts.viewerProfileId ?? null;
  if (!opts.skipCustomBackfill) {
    await ensureCustomCategoryFreezeComplete(editionId, db);
  }

  const [communityRows, voicesRows, categoryBoards, voiceColumns] =
    await Promise.all([
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
      loadEditionCategorySnapshot(
        editionId,
        ["community", "voices"],
        { maxRank: 1, rankMode },
        db,
      ),
      listEditionResultVoiceColumns(editionId, db),
    ]);
  const communityBlocks = categoryBoards.community.podiums;
  const voicesBlocks = categoryBoards.voices.podiums;

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

  const [rankRows, sitePickRows, customPickRows] =
    uniqueProfileIds.length > 0
      ? await db.batch([
          ballotVoterRankQuery(db, editionId, uniqueProfileIds),
          ballotVoterCategoryPickQuery(db, editionId, uniqueProfileIds),
          ballotVoterCustomPickQuery(db, editionId, uniqueProfileIds),
        ])
      : [[], [], []];
  const voterRanks = mapBallotVoterRanks(rankRows);
  const picks = [
    ...mapBallotVoterCategoryPicks(sitePickRows),
    ...customPicksToComparisonLines(mapBallotVoterCustomPicks(customPickRows)),
  ];

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
  customCategoryPicks: Array<{
    categoryId: string;
    gameId: string | null;
    entryId: string | null;
    title: string;
    subtitle: string | null;
    imageUrl: string | null;
    coverUrl: string | null;
    supportLinkUrl?: string | null;
  }>;
} | null> {
  const [voter] = await db
    .select({
      profileId: communityEditionResultVoters.profileId,
      displayName: communityEditionResultVoters.displayName,
      username: communityEditionResultVoters.username,
      isVoice: communityEditionResultVoters.isVoice,
      avatarUrl: profiles.avatarUrl,
    })
    .from(communityEditionResultVoters)
    .leftJoin(
      profiles,
      eq(profiles.id, communityEditionResultVoters.profileId),
    )
    .where(
      and(
        eq(communityEditionResultVoters.editionId, editionId),
        eq(communityEditionResultVoters.profileId, profileId),
      ),
    )
    .limit(1);
  if (!voter) return null;

  const [ranks, categoryPicks, customCategoryPicks] = await Promise.all([
    loadBallotVoterRanks(editionId, [profileId], db),
    loadBallotVoterCategoryPicks(editionId, [profileId], db),
    loadBallotVoterCustomCategoryPicks(editionId, [profileId], db),
  ]);

  return {
    voter: {
      profileId: voter.profileId,
      displayName: voter.displayName,
      username: voter.username,
      isVoice: voter.isVoice,
      avatarUrl: voter.avatarUrl,
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
    customCategoryPicks: customCategoryPicks.map((r) => ({
      categoryId: r.categoryId,
      gameId: r.gameId,
      entryId: r.entryId,
      title: r.title,
      subtitle: r.subtitle,
      imageUrl: r.imageUrl,
      coverUrl: r.coverUrl,
      supportLinkUrl: r.supportLinkUrl,
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
