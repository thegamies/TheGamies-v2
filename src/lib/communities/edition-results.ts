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
  BALLOT_MATRIX_TOP,
  matrixHasAnyGames,
  type EditionBallotMatrixRow,
  type MatrixVoiceColumn,
} from "./edition-ballot-matrix";
import {
  aggregateEditionCategories,
  aggregateEditionGoty,
  storageModeFor,
  type EditionResultMode,
  type GameMeta,
} from "./edition-results-scoring";
import { getEditionByCommunityYear } from "./editions";
import { listEditionVoiceProfileIds } from "./voices";

export {
  parseEditionResultMode,
  parseEditionResultsView,
  type EditionResultsPublicMode,
  type EditionResultsViewId,
} from "./edition-results-scoring";

export {
  BALLOT_MATRIX_TOP,
  type EditionBallotMatrixRow,
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
  opts: { page?: number; pageSize?: number; afterPlace?: number } = {},
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

  return {
    page,
    pageSize,
    total,
    totalPages,
    rows: rows.map((r) => ({
      place: r.place,
      gameId: r.gameId,
      slug: r.slug,
      title: r.title,
      year: r.gameYear,
      coverUrl: r.coverUrl,
      points: r.points,
      firstPlaceVotes: r.firstPlaceVotes,
      appearances: r.appearances,
    })),
  };
}

export async function getEditionCategoryResults(
  editionId: string,
  mode: EditionResultMode,
  opts: { maxPlace?: number } = {},
  db: Db = getDb(),
): Promise<EditionCategoryStandingBlock[]> {
  const storage = storageModeFor(mode);
  const maxPlace =
    opts.maxPlace != null && Number.isFinite(opts.maxPlace)
      ? Math.max(1, Math.floor(opts.maxPlace))
      : null;

  const conditions = [
    eq(communityEditionResultCategories.editionId, editionId),
    eq(communityEditionResultCategories.mode, storage),
  ];
  if (maxPlace != null) {
    conditions.push(lte(communityEditionResultCategories.place, maxPlace));
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
      gameId: row.gameId,
      slug: row.slug,
      title: row.title,
      coverUrl: row.coverUrl,
      votes: row.votes,
    });
  }
  return [...byId.values()];
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

export type EditionCategoryPickCard = {
  kind: "you" | "voice";
  profileId: string;
  displayName: string;
  username: string;
  gameId: string;
  slug: string;
  title: string;
  coverUrl: string | null;
};

/** You + Voice picks per category for Overview strips (cheap: Voices roster only). */
export async function getEditionCategoryPickStrips(
  editionId: string,
  opts: { viewerProfileId?: string | null } = {},
  db: Db = getDb(),
): Promise<Record<string, EditionCategoryPickCard[]>> {
  const voiceRows = await db
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
  const profileIds = [
    ...voiceRows.map((v) => v.profileId),
    ...(viewerProfileId ? [viewerProfileId] : []),
  ];
  const uniqueIds = [...new Set(profileIds)];
  if (uniqueIds.length === 0) return {};

  const voterLabel = new Map(
    voiceRows.map((v) => [
      v.profileId,
      { displayName: v.displayName, username: v.username },
    ]),
  );

  let youLabel: { displayName: string; username: string } | null = null;
  if (viewerProfileId && !voterLabel.has(viewerProfileId)) {
    const [you] = await db
      .select({
        displayName: communityEditionResultVoters.displayName,
        username: communityEditionResultVoters.username,
      })
      .from(communityEditionResultVoters)
      .where(
        and(
          eq(communityEditionResultVoters.editionId, editionId),
          eq(communityEditionResultVoters.profileId, viewerProfileId),
        ),
      )
      .limit(1);
    if (you) youLabel = you;
  } else if (viewerProfileId) {
    youLabel = voterLabel.get(viewerProfileId) ?? null;
  }

  const picks = await db
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
          uniqueIds,
        ),
      ),
    );

  const voiceIdSet = new Set(voiceRows.map((v) => v.profileId));
  const byCategory = new Map<string, EditionCategoryPickCard[]>();

  for (const pick of picks) {
    const isYou = Boolean(
      viewerProfileId && pick.profileId === viewerProfileId && youLabel,
    );
    const isVoice = voiceIdSet.has(pick.profileId);
    if (!isYou && !isVoice) continue;

    // Prefer a dedicated You card; Voice who is also you still gets You first via kind.
    const label = isYou
      ? youLabel!
      : voterLabel.get(pick.profileId);
    if (!label) continue;

    const card: EditionCategoryPickCard = {
      kind: isYou ? "you" : "voice",
      profileId: pick.profileId,
      displayName: isYou ? "You" : label.displayName,
      username: label.username,
      gameId: pick.gameId,
      slug: pick.slug,
      title: pick.title,
      coverUrl: pick.coverUrl,
    };

    const list = byCategory.get(pick.categoryId) ?? [];
    // If viewer is also a Voice, keep You and skip duplicate Voice card for same profile.
    if (isYou) {
      list.unshift(card);
    } else if (
      !(viewerProfileId && pick.profileId === viewerProfileId)
    ) {
      list.push(card);
    } else {
      // Voice same as viewer already added as You
    }
    byCategory.set(pick.categoryId, list);
  }

  // Stable Voice order: You first, then Voices by display name (already ordered in voiceRows)
  const voiceOrder = new Map(voiceRows.map((v, i) => [v.profileId, i]));
  for (const [categoryId, list] of byCategory) {
    list.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "you" ? -1 : 1;
      return (
        (voiceOrder.get(a.profileId) ?? 0) - (voiceOrder.get(b.profileId) ?? 0)
      );
    });
    // Dedupe profileId (You wins)
    const seen = new Set<string>();
    const deduped: EditionCategoryPickCard[] = [];
    for (const card of list) {
      if (seen.has(card.profileId)) continue;
      seen.add(card.profileId);
      deduped.push(card);
    }
    byCategory.set(categoryId, deduped);
  }

  return Object.fromEntries(byCategory);
}

export async function getEditionCategoryPage(
  editionId: string,
  mode: EditionResultMode,
  categoryId: string,
  opts: { page?: number; pageSize?: number } = {},
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

  return {
    page,
    pageSize,
    total,
    totalPages,
    rows: rows.map((r) => ({
      place: r.place,
      gameId: r.gameId,
      slug: r.slug,
      title: r.title,
      coverUrl: r.coverUrl,
      votes: r.votes,
    })),
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
  rows: EditionBallotMatrixRow[];
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
      { page: 1, pageSize: BALLOT_MATRIX_TOP },
      db,
    ),
    getEditionGotyPage(
      editionId,
      "voices",
      { page: 1, pageSize: BALLOT_MATRIX_TOP },
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

  const rows = assembleBallotMatrixRows({
    community: communityPage.rows.map((r) => ({
      place: r.place,
      gameId: r.gameId,
      slug: r.slug,
      title: r.title,
      coverUrl: r.coverUrl,
    })),
    voices: voicesPage.rows.map((r) => ({
      place: r.place,
      gameId: r.gameId,
      slug: r.slug,
      title: r.title,
      coverUrl: r.coverUrl,
    })),
    voiceColumns,
    voterRanks,
    viewerProfileId,
    includeYou: showYou,
  });

  return {
    showYou,
    hasGames: matrixHasAnyGames(rows),
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
