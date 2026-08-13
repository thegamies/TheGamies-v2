import { and, asc, eq, gt, inArray, lte, sql } from "drizzle-orm";
import {
  awardCategories,
  communityEditionBallotCategoryVotes,
  communityEditionBallotItems,
  communityEditionBallots,
  communityEditionResultCategories,
  communityEditionResultGoty,
  communityEditionResultMeta,
  communityEditionResultVoterCategoryPicks,
  communityEditionResultVoterRanks,
  communityEditionResultVoters,
  covers,
  createDb,
  games,
  profiles,
  type Db,
} from "@thegamies/db";
import { STANDINGS_PAGE_SIZE } from "@/lib/live-aggregate/service";
import {
  assembleBallotMatrixRows,
  assembleCategoryComparisonRows,
  BALLOT_MATRIX_STANDINGS_FETCH,
  categoryComparisonHasGames,
  matrixHasAnyGames,
  type EditionBallotMatrixRow,
  type EditionCategoryComparisonRow,
  type MatrixGameCell,
  type MatrixVoiceColumn,
} from "./edition-ballot-matrix";
import {
  aggregateEditionCategories,
  aggregateEditionGoty,
  storageModeFor,
  type EditionResultMode,
  type GameMeta,
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
  type EditionResultsPublicMode,
  type EditionResultsViewId,
  type SharedRankMode,
} from "./edition-results-scoring";

export {
  BALLOT_MATRIX_TOP,
  BALLOT_MATRIX_STANDINGS_FETCH,
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

async function clearEditionResultTables(editionId: string, db: Db) {
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
  const ballotIds = ballots.map((b) => b.ballotId);

  const itemRows =
    ballotIds.length === 0
      ? []
      : await db
          .select({
            ballotId: communityEditionBallotItems.ballotId,
            profileId: communityEditionBallots.profileId,
            gameId: communityEditionBallotItems.gameId,
            rank: communityEditionBallotItems.rank,
          })
          .from(communityEditionBallotItems)
          .innerJoin(
            communityEditionBallots,
            eq(communityEditionBallots.id, communityEditionBallotItems.ballotId),
          )
          .where(inArray(communityEditionBallotItems.ballotId, ballotIds));

  const catVoteRows =
    ballotIds.length === 0
      ? []
      : await db
          .select({
            ballotId: communityEditionBallotCategoryVotes.ballotId,
            profileId: communityEditionBallots.profileId,
            categoryId: communityEditionBallotCategoryVotes.categoryId,
            gameId: communityEditionBallotCategoryVotes.gameId,
          })
          .from(communityEditionBallotCategoryVotes)
          .innerJoin(
            communityEditionBallots,
            eq(
              communityEditionBallots.id,
              communityEditionBallotCategoryVotes.ballotId,
            ),
          )
          .where(
            inArray(communityEditionBallotCategoryVotes.ballotId, ballotIds),
          );

  const gameIds = [
    ...new Set([
      ...itemRows.map((r) => r.gameId),
      ...catVoteRows.map((r) => r.gameId),
    ]),
  ];

  const gameMeta = new Map<string, GameMeta>();
  if (gameIds.length > 0) {
    const found = await db
      .select({
        id: games.id,
        slug: games.slug,
        title: games.title,
        year: games.year,
        coverImageId: covers.imageId,
      })
      .from(games)
      .leftJoin(covers, eq(covers.igdbId, games.coverIgdbId))
      .where(inArray(games.id, gameIds));
    for (const g of found) {
      gameMeta.set(g.id, {
        gameId: g.id,
        slug: g.slug,
        title: g.title,
        gameYear: g.year,
        coverUrl: coverUrlFrom(g.coverImageId),
      });
    }
  }

  const rankedLines = itemRows.map((r) => ({
    profileId: r.profileId,
    gameId: r.gameId,
    rank: r.rank,
  }));
  const categoryLines = catVoteRows.map((r) => ({
    profileId: r.profileId,
    categoryId: r.categoryId,
    gameId: r.gameId,
  }));

  const communityGoty = aggregateEditionGoty(rankedLines, gameMeta);
  const voicesGoty = aggregateEditionGoty(rankedLines, gameMeta, voiceIds);
  const communityCats = aggregateEditionCategories(categoryLines, gameMeta);
  const voicesCats = aggregateEditionCategories(
    categoryLines,
    gameMeta,
    voiceIds,
  );

  const categoryDefs = await db
    .select({
      id: awardCategories.id,
      label: awardCategories.label,
      description: awardCategories.description,
      sortOrder: awardCategories.sortOrder,
    })
    .from(awardCategories);
  const catDefById = new Map(categoryDefs.map((c) => [c.id, c]));

  const ballotCountCommunity = ballots.length;
  const ballotCountVoices = ballots.filter((b) =>
    voiceIds.has(b.profileId),
  ).length;

  const frozenAt = new Date();
  try {
    await db.insert(communityEditionResultMeta).values({
      editionId,
      frozenAt,
      ballotCountCommunity,
      ballotCountVoices,
      gotyTotalCommunity: communityGoty.length,
      gotyTotalVoices: voicesGoty.length,
    });
  } catch {
    const raced = await getEditionResultsMeta(editionId, db);
    if (raced) return raced;
    return { error: "Could not freeze edition results." };
  }

  async function insertGoty(
    mode: "community" | "voices",
    rows: typeof communityGoty,
  ) {
    if (rows.length === 0) return;
    await db.insert(communityEditionResultGoty).values(
      rows.map((row) => ({
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
      })),
    );
  }

  await insertGoty("community", communityGoty);
  await insertGoty("voices", voicesGoty);

  async function insertCats(
    mode: "community" | "voices",
    rows: typeof communityCats,
  ) {
    if (rows.length === 0) return;
    await db.insert(communityEditionResultCategories).values(
      rows.map((row) => {
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
      }),
    );
  }

  await insertCats("community", communityCats);
  await insertCats("voices", voicesCats);

  if (ballots.length > 0) {
    await db.insert(communityEditionResultVoters).values(
      ballots.map((b) => ({
        editionId,
        profileId: b.profileId,
        isVoice: voiceIds.has(b.profileId),
        displayName: b.displayName,
        username: b.username,
      })),
    );
  }

  const top10 = itemRows.filter((r) => r.rank >= 1 && r.rank <= 10);
  if (top10.length > 0) {
    await db.insert(communityEditionResultVoterRanks).values(
      top10.map((r) => {
        const meta = gameMeta.get(r.gameId);
        return {
          editionId,
          profileId: r.profileId,
          rank: r.rank,
          gameId: r.gameId,
          slug: meta?.slug ?? "",
          title: meta?.title ?? "Unknown",
          coverUrl: meta?.coverUrl ?? null,
        };
      }),
    );
  }

  if (catVoteRows.length > 0) {
    await db.insert(communityEditionResultVoterCategoryPicks).values(
      catVoteRows.map((r) => {
        const meta = gameMeta.get(r.gameId);
        return {
          editionId,
          profileId: r.profileId,
          categoryId: r.categoryId,
          gameId: r.gameId,
          slug: meta?.slug ?? "",
          title: meta?.title ?? "Unknown",
          coverUrl: meta?.coverUrl ?? null,
        };
      }),
    );
  }

  return {
    frozenAt,
    ballotCountCommunity,
    ballotCountVoices,
    gotyTotalCommunity: communityGoty.length,
    gotyTotalVoices: voicesGoty.length,
  };
}

/** Public ensure: freeze only when edition status is published. */
export async function ensurePublishedEditionResults(
  communityId: string,
  year: number,
  db: Db = getDb(),
): Promise<EditionResultsMeta | null | { error: string }> {
  const edition = await getEditionByCommunityYear(communityId, year, db);
  if (!edition) return null;
  if (edition.status !== "published") return null;
  return freezeEditionResults(edition.id, db);
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

export async function getEditionCategoryResults(
  editionId: string,
  mode: EditionResultMode,
  opts: { maxPlace?: number; rankMode?: SharedRankMode } = {},
  db: Db = getDb(),
): Promise<EditionCategoryStandingBlock[]> {
  const storage = storageModeFor(mode);
  const maxPlace =
    opts.maxPlace != null && Number.isFinite(opts.maxPlace)
      ? Math.max(1, Math.floor(opts.maxPlace))
      : null;
  const rankMode = opts.rankMode ?? "competition";
  const fetchPlace =
    maxPlace != null ? Math.max(maxPlace, maxPlace * 3) : null;

  const conditions = [
    eq(communityEditionResultCategories.editionId, editionId),
    eq(communityEditionResultCategories.mode, storage),
  ];
  if (fetchPlace != null) {
    conditions.push(lte(communityEditionResultCategories.place, fetchPlace));
  }

  const rows = await db
    .select()
    .from(communityEditionResultCategories)
    .where(and(...conditions))
    .orderBy(
      asc(communityEditionResultCategories.sortOrder),
      asc(communityEditionResultCategories.place),
    );

  const byId = new Map<string, EditionCategoryStandingBlock>();
  for (const row of rows) {
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
  const blocks = [...byId.values()].map((block) => {
    const ranked = withDisplayRanks(block.rows, (r) => r.votes, rankMode);
    return {
      ...block,
      rows:
        maxPlace != null
          ? ranked.filter((r) => r.rank <= maxPlace)
          : ranked,
    };
  });
  return blocks;
}

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
  /** Competition slots (1–1–3 skip). */
  rows: EditionBallotMatrixRow[];
  /** Dense slots (1–1–2). */
  rowsDense: EditionBallotMatrixRow[];
  /** Board span: tie group repeats in every ordinal slot it occupies. */
  rowsSpan: EditionBallotMatrixRow[];
};

/**
 * Parallel top-10 GOTY lists: rank rows × You / Community / Voices / each Voice.
 * Fixed 10 rows — no board pagination blob.
 */
export async function getEditionBallotMatrix(
  editionId: string,
  opts: {
    viewerProfileId?: string | null;
  } = {},
  db: Db = getDb(),
): Promise<EditionBallotMatrix> {
  const [communityPage, voicesPage] = await Promise.all([
    getEditionGotyPage(
      editionId,
      "community",
      { page: 1, pageSize: BALLOT_MATRIX_STANDINGS_FETCH },
      db,
    ),
    getEditionGotyPage(
      editionId,
      "voices",
      { page: 1, pageSize: BALLOT_MATRIX_STANDINGS_FETCH },
      db,
    ),
  ]);

  const voiceColumns = await db
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

  const viewerProfileId = opts.viewerProfileId ?? null;
  let showYou = false;
  if (viewerProfileId) {
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
    showYou = Boolean(viewerRow);
  }

  const profileIdsForRanks = [
    ...voiceColumns.map((v) => v.profileId),
    ...(showYou && viewerProfileId ? [viewerProfileId] : []),
  ];
  const uniqueProfileIds = [...new Set(profileIdsForRanks)];

  let voterRanks: Array<{
    profileId: string;
    rank: number;
    gameId: string;
    slug: string;
    title: string;
    coverUrl: string | null;
  }> = [];
  if (uniqueProfileIds.length > 0) {
    voterRanks = await db
      .select({
        profileId: communityEditionResultVoterRanks.profileId,
        rank: communityEditionResultVoterRanks.rank,
        gameId: communityEditionResultVoterRanks.gameId,
        slug: communityEditionResultVoterRanks.slug,
        title: communityEditionResultVoterRanks.title,
        coverUrl: communityEditionResultVoterRanks.coverUrl,
      })
      .from(communityEditionResultVoterRanks)
      .where(
        and(
          eq(communityEditionResultVoterRanks.editionId, editionId),
          inArray(communityEditionResultVoterRanks.profileId, uniqueProfileIds),
        ),
      );
  }

  const standingInput = {
    community: communityPage.rows.map((r) => ({
      place: r.place,
      points: r.points,
      gameId: r.gameId,
      slug: r.slug,
      title: r.title,
      coverUrl: r.coverUrl,
    })),
    voices: voicesPage.rows.map((r) => ({
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
  } as const;

  const rows = assembleBallotMatrixRows({
    ...standingInput,
    tieMode: "competition",
  });
  const rowsDense = assembleBallotMatrixRows({
    ...standingInput,
    tieMode: "dense",
  });
  const rowsSpan = assembleBallotMatrixRows({
    ...standingInput,
    tieMode: "span",
  });

  return {
    showYou,
    hasGames:
      matrixHasAnyGames(rows) ||
      matrixHasAnyGames(rowsDense) ||
      matrixHasAnyGames(rowsSpan),
    voiceColumns,
    rows,
    rowsDense,
    rowsSpan,
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

/**
 * Award rows × You / Community (#1) / Voices (#1) / each Voice pick.
 * Place-1 boards only — not full category tallies.
 */
export async function getEditionCategoryComparisonMatrix(
  editionId: string,
  opts: { viewerProfileId?: string | null; rankMode?: SharedRankMode } = {},
  db: Db = getDb(),
): Promise<EditionCategoryComparisonMatrix> {
  const rankMode = opts.rankMode ?? "competition";
  const [communityBlocks, voicesBlocks, voiceColumns] = await Promise.all([
    getEditionCategoryResults(editionId, "community", { maxPlace: 1, rankMode }, db),
    getEditionCategoryResults(editionId, "voices", { maxPlace: 1, rankMode }, db),
    db
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
      ),
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

  const viewerProfileId = opts.viewerProfileId ?? null;
  let showYou = false;
  if (viewerProfileId) {
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
    showYou = Boolean(viewerRow);
  }

  const profileIds = [
    ...voiceColumns.map((v) => v.profileId),
    ...(showYou && viewerProfileId ? [viewerProfileId] : []),
  ];
  const uniqueProfileIds = [...new Set(profileIds)];

  let picks: Array<{
    profileId: string;
    categoryId: string;
    gameId: string;
    slug: string;
    title: string;
    coverUrl: string | null;
  }> = [];
  if (uniqueProfileIds.length > 0 && categories.length > 0) {
    picks = await db
      .select({
        profileId: communityEditionResultVoterCategoryPicks.profileId,
        categoryId: communityEditionResultVoterCategoryPicks.categoryId,
        gameId: communityEditionResultVoterCategoryPicks.gameId,
        slug: communityEditionResultVoterCategoryPicks.slug,
        title: communityEditionResultVoterCategoryPicks.title,
        coverUrl: communityEditionResultVoterCategoryPicks.coverUrl,
      })
      .from(communityEditionResultVoterCategoryPicks)
      .where(
        and(
          eq(communityEditionResultVoterCategoryPicks.editionId, editionId),
          inArray(
            communityEditionResultVoterCategoryPicks.profileId,
            uniqueProfileIds,
          ),
        ),
      );
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

  const ranks = await db
    .select()
    .from(communityEditionResultVoterRanks)
    .where(
      and(
        eq(communityEditionResultVoterRanks.editionId, editionId),
        eq(communityEditionResultVoterRanks.profileId, profileId),
      ),
    )
    .orderBy(asc(communityEditionResultVoterRanks.rank));

  const categoryPicks = await db
    .select()
    .from(communityEditionResultVoterCategoryPicks)
    .where(
      and(
        eq(communityEditionResultVoterCategoryPicks.editionId, editionId),
        eq(communityEditionResultVoterCategoryPicks.profileId, profileId),
      ),
    );

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
