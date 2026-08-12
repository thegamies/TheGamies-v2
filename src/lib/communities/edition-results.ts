import { and, asc, eq, inArray, sql } from "drizzle-orm";
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
  type EditionResultsPublicMode,
} from "./edition-results-scoring";

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
  opts: { page?: number; pageSize?: number } = {},
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
  const meta = await getEditionResultsMeta(editionId, db);
  const total =
    storage === "voices"
      ? (meta?.gotyTotalVoices ?? 0)
      : (meta?.gotyTotalCommunity ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const requested = Math.max(1, Math.floor(opts.page ?? 1));
  const page = Math.min(requested, totalPages);
  const offset = (page - 1) * pageSize;

  const rows = await db
    .select()
    .from(communityEditionResultGoty)
    .where(
      and(
        eq(communityEditionResultGoty.editionId, editionId),
        eq(communityEditionResultGoty.mode, storage),
      ),
    )
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
  db: Db = getDb(),
): Promise<EditionCategoryStandingBlock[]> {
  const storage = storageModeFor(mode);
  const rows = await db
    .select()
    .from(communityEditionResultCategories)
    .where(
      and(
        eq(communityEditionResultCategories.editionId, editionId),
        eq(communityEditionResultCategories.mode, storage),
      ),
    )
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
