import { and, asc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import {
  awardCategories,
  communityEditionBallotCategoryVotes,
  communityEditionBallotItems,
  communityEditionBallots,
  communityEditionVoices,
  covers,
  createDb,
  games,
  profiles,
  type Db,
} from "@thegamies/db";
import {
  gotyEligibilityError,
  normalizeRanks,
} from "@/lib/lists/rules";
import { parseAwardCategoryEligibility } from "@/lib/live-aggregate/award-category-defs";
import { categoryEligibilityError } from "@/lib/live-aggregate/category-eligibility";
import type { EditionStatus } from "./edition-status";
import { getEditionByCommunityYear } from "./editions";
import {
  EDITION_BALLOT_MAX_ITEMS,
  saveEditionBallotCategoryVotesSchema,
  saveEditionBallotItemsSchema,
} from "./ballot-schema";
import type { CommunityRole } from "./schema";
import { getCommunityBySlug } from "./service";

function getDb(): Db {
  return createDb();
}

export type EditionBallotItemView = {
  gameId: string;
  igdbId: number;
  slug: string;
  title: string;
  year: number | null;
  coverUrl: string | null;
  rank: number;
  blurb: string;
};

export type EditionBallotCategoryVoteView = {
  categoryId: string;
  gameId: string;
  title: string;
  coverUrl: string | null;
};

export type EditionBallotView = {
  ballotId: string;
  submittedAt: Date;
  updatedAt: Date;
  items: EditionBallotItemView[];
  categoryVotes: EditionBallotCategoryVoteView[];
};

/** Writes only while the edition status is open. */
export function editionBallotWriteBlockedReason(
  status: EditionStatus,
): string | null {
  if (status === "open") return null;
  if (status === "scheduled") return "Voting has not opened yet.";
  if (status === "closed" || status === "published") {
    return "Voting has closed.";
  }
    return "This event is not open for voting.";
}

/** Signed-in community members (including hosts) may submit. */
export function canSubmitEditionBallot(
  role: CommunityRole | null,
): boolean {
  return role != null;
}

function coverUrlFromImageId(imageId: string | null): string | null {
  return imageId
    ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${imageId}.jpg`
    : null;
}

export async function getEditionBallotForProfile(
  editionId: string,
  profileId: string,
  db: Db = getDb(),
): Promise<EditionBallotView | null> {
  const [ballot] = await db
    .select()
    .from(communityEditionBallots)
    .where(
      and(
        eq(communityEditionBallots.editionId, editionId),
        eq(communityEditionBallots.profileId, profileId),
      ),
    )
    .limit(1);
  if (!ballot) return null;

  const itemRows = await db
    .select({
      gameId: communityEditionBallotItems.gameId,
      rank: communityEditionBallotItems.rank,
      blurb: communityEditionBallotItems.blurb,
      igdbId: games.igdbId,
      slug: games.slug,
      title: games.title,
      year: games.year,
      coverImageId: covers.imageId,
    })
    .from(communityEditionBallotItems)
    .innerJoin(games, eq(games.id, communityEditionBallotItems.gameId))
    .leftJoin(covers, eq(covers.igdbId, games.coverIgdbId))
    .where(eq(communityEditionBallotItems.ballotId, ballot.id))
    .orderBy(asc(communityEditionBallotItems.rank));

  const voteRows = await db
    .select({
      categoryId: communityEditionBallotCategoryVotes.categoryId,
      gameId: communityEditionBallotCategoryVotes.gameId,
      title: games.title,
      coverImageId: covers.imageId,
    })
    .from(communityEditionBallotCategoryVotes)
    .innerJoin(
      games,
      eq(games.id, communityEditionBallotCategoryVotes.gameId),
    )
    .leftJoin(covers, eq(covers.igdbId, games.coverIgdbId))
    .where(eq(communityEditionBallotCategoryVotes.ballotId, ballot.id));

  return {
    ballotId: ballot.id,
    submittedAt: ballot.submittedAt,
    updatedAt: ballot.updatedAt,
    items: itemRows.map((row) => ({
      gameId: row.gameId,
      igdbId: row.igdbId,
      slug: row.slug,
      title: row.title,
      year: row.year,
      coverUrl: coverUrlFromImageId(row.coverImageId),
      rank: row.rank,
      blurb: row.blurb ?? "",
    })),
    categoryVotes: voteRows.map((row) => ({
      categoryId: row.categoryId,
      gameId: row.gameId,
      title: row.title,
      coverUrl: coverUrlFromImageId(row.coverImageId),
    })),
  };
}

/** Live (pre-freeze) submitters — for hosts while voting is open/closed. */
export async function listEditionBallotSubmitters(
  editionId: string,
  db: Db = getDb(),
): Promise<
  Array<{
    profileId: string;
    displayName: string;
    username: string;
    isVoice: boolean;
    itemCount: number;
    submittedAt: Date;
  }>
> {
  const rows = await db
    .select({
      profileId: communityEditionBallots.profileId,
      displayName: profiles.displayName,
      username: profiles.username,
      submittedAt: communityEditionBallots.submittedAt,
      ballotId: communityEditionBallots.id,
    })
    .from(communityEditionBallots)
    .innerJoin(profiles, eq(profiles.id, communityEditionBallots.profileId))
    .where(eq(communityEditionBallots.editionId, editionId))
    .orderBy(asc(profiles.displayName), asc(profiles.username));

  if (rows.length === 0) return [];

  const voiceRows = await db
    .select({ profileId: communityEditionVoices.profileId })
    .from(communityEditionVoices)
    .where(eq(communityEditionVoices.editionId, editionId));
  const voiceIds = new Set(voiceRows.map((r) => r.profileId));

  const ballotIds = rows.map((r) => r.ballotId);
  const itemCountRows = await db
    .select({
      ballotId: communityEditionBallotItems.ballotId,
      n: sql<number>`count(*)::int`,
    })
    .from(communityEditionBallotItems)
    .where(inArray(communityEditionBallotItems.ballotId, ballotIds))
    .groupBy(communityEditionBallotItems.ballotId);

  const countByBallot = new Map(
    itemCountRows.map((row) => [row.ballotId, Number(row.n)]),
  );

  return rows.map((row) => ({
    profileId: row.profileId,
    displayName: row.displayName,
    username: row.username,
    isVoice: voiceIds.has(row.profileId),
    itemCount: countByBallot.get(row.ballotId) ?? 0,
    submittedAt: row.submittedAt,
  }));
}

export async function countEditionSubmittedBallots(
  editionId: string,
  db: Db = getDb(),
): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(communityEditionBallots)
    .where(eq(communityEditionBallots.editionId, editionId));
  return Number(row?.n ?? 0);
}

export async function getLiveEditionVotersPage(
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
  rows: Array<{
    profileId: string;
    displayName: string;
    username: string;
    isVoice: boolean;
  }>;
}> {
  const pageSize = Math.min(200, Math.max(1, Math.floor(opts.pageSize ?? 50)));
  const q = opts.q?.trim() ?? "";

  const conditions = [eq(communityEditionBallots.editionId, editionId)];
  if (opts.voicesOnly) {
    conditions.push(isNotNull(communityEditionVoices.profileId));
  }
  if (q.length >= 1) {
    conditions.push(
      sql`(${profiles.displayName} ILIKE ${`%${q}%`} OR ${profiles.username} ILIKE ${`%${q}%`})`,
    );
  }
  const where = and(...conditions);

  const fromVoters = () =>
    db
      .select({
        profileId: communityEditionBallots.profileId,
        displayName: profiles.displayName,
        username: profiles.username,
        voiceProfileId: communityEditionVoices.profileId,
      })
      .from(communityEditionBallots)
      .innerJoin(profiles, eq(profiles.id, communityEditionBallots.profileId))
      .leftJoin(
        communityEditionVoices,
        and(
          eq(communityEditionVoices.editionId, communityEditionBallots.editionId),
          eq(communityEditionVoices.profileId, communityEditionBallots.profileId),
        ),
      )
      .where(where);

  const [countRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(communityEditionBallots)
    .innerJoin(profiles, eq(profiles.id, communityEditionBallots.profileId))
    .leftJoin(
      communityEditionVoices,
      and(
        eq(communityEditionVoices.editionId, communityEditionBallots.editionId),
        eq(communityEditionVoices.profileId, communityEditionBallots.profileId),
      ),
    )
    .where(where);

  const total = Number(countRow?.n ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const requested = Math.max(1, Math.floor(opts.page ?? 1));
  const page = Math.min(requested, totalPages);
  const offset = (page - 1) * pageSize;

  const rows = await fromVoters()
    .orderBy(asc(profiles.displayName), asc(profiles.username))
    .limit(pageSize)
    .offset(offset);

  return {
    page,
    pageSize,
    total,
    totalPages,
    rows: rows.map((row) => ({
      profileId: row.profileId,
      displayName: row.displayName,
      username: row.username,
      isVoice: Boolean(row.voiceProfileId),
    })),
  };
}

export async function upsertEditionBallot(input: {
  slug: string;
  year: number;
  profileId: string;
  items: unknown;
  categoryVotes: unknown;
  db?: Db;
}): Promise<EditionBallotView | { error: string }> {
  const db = input.db ?? getDb();
  const slug = input.slug.trim().toLowerCase();
  const year = Math.floor(input.year);

  const itemsParsed = saveEditionBallotItemsSchema.safeParse(input.items);
  if (!itemsParsed.success) {
    return {
      error:
        itemsParsed.error.issues[0]?.message ??
        `Ballots can hold at most ${EDITION_BALLOT_MAX_ITEMS} games.`,
    };
  }
  const votesParsed = saveEditionBallotCategoryVotesSchema.safeParse(
    input.categoryVotes,
  );
  if (!votesParsed.success) {
    return {
      error:
        votesParsed.error.issues[0]?.message ?? "Only one game per category.",
    };
  }

  const detail = await getCommunityBySlug(slug, input.profileId, db);
  if (!detail) return { error: "Community not found." };
  if (!canSubmitEditionBallot(detail.viewerRole)) {
    return { error: "Join this community to submit a ballot." };
  }

  const edition = await getEditionByCommunityYear(detail.id, year, db);
  if (!edition) return { error: "Event not found." };

  const writeBlock = editionBallotWriteBlockedReason(edition.status);
  if (writeBlock) return { error: writeBlock };

  const normalized = normalizeRanks(itemsParsed.data);
  if (normalized.length > 0) {
    const gameIds = [...new Set(normalized.map((i) => i.gameId))];
    const found = await db
      .select({
        id: games.id,
        year: games.year,
        firstReleaseDate: games.firstReleaseDate,
        versionParentIgdbId: games.versionParentIgdbId,
        isAdult: games.isAdult,
      })
      .from(games)
      .where(inArray(games.id, gameIds));
    if (found.length !== gameIds.length) {
      return { error: "One or more games could not be found." };
    }
    const byId = new Map(found.map((g) => [g.id, g]));
    for (const item of normalized) {
      const game = byId.get(item.gameId);
      if (!game) return { error: "One or more games could not be found." };
      const err = gotyEligibilityError(game, year);
      if (err) return { error: err };
    }
  }

  const votes = votesParsed.data;
  if (votes.length > 0) {
    const categoryIds = [...new Set(votes.map((v) => v.categoryId))];
    const activeCats = await db
      .select({
        id: awardCategories.id,
        eligibility: awardCategories.eligibility,
        allowEditions: awardCategories.allowEditions,
      })
      .from(awardCategories)
      .where(
        and(
          inArray(awardCategories.id, categoryIds),
          eq(awardCategories.active, true),
        ),
      );
    if (activeCats.length !== categoryIds.length) {
      return { error: "One or more categories are not available." };
    }
    const catById = new Map(activeCats.map((c) => [c.id, c]));

    const gameIds = [...new Set(votes.map((v) => v.gameId))];
    const found = await db
      .select({
        id: games.id,
        year: games.year,
        firstReleaseDate: games.firstReleaseDate,
        versionParentIgdbId: games.versionParentIgdbId,
        isAdult: games.isAdult,
      })
      .from(games)
      .where(inArray(games.id, gameIds));
    if (found.length !== gameIds.length) {
      return { error: "One or more games could not be found." };
    }
    const byId = new Map(found.map((g) => [g.id, g]));
    for (const vote of votes) {
      const game = byId.get(vote.gameId);
      if (!game) return { error: "One or more games could not be found." };
      const cat = catById.get(vote.categoryId);
      if (!cat) return { error: "One or more categories are not available." };
      const err = categoryEligibilityError(
        game,
        year,
        parseAwardCategoryEligibility(cat.eligibility),
        { allowEditions: cat.allowEditions },
      );
      if (err) return { error: err };
    }
  }

  const now = new Date();
  const existing = await db
    .select()
    .from(communityEditionBallots)
    .where(
      and(
        eq(communityEditionBallots.editionId, edition.id),
        eq(communityEditionBallots.profileId, input.profileId),
      ),
    )
    .limit(1);

  let ballotId: string;
  if (existing[0]) {
    ballotId = existing[0].id;
    await db
      .update(communityEditionBallots)
      .set({ updatedAt: now })
      .where(eq(communityEditionBallots.id, ballotId));
  } else {
    const [created] = await db
      .insert(communityEditionBallots)
      .values({
        editionId: edition.id,
        profileId: input.profileId,
        submittedAt: now,
        updatedAt: now,
      })
      .returning();
    if (!created) return { error: "Could not save the ballot." };
    ballotId = created.id;
  }

  await db
    .delete(communityEditionBallotItems)
    .where(eq(communityEditionBallotItems.ballotId, ballotId));
  if (normalized.length > 0) {
    await db.insert(communityEditionBallotItems).values(
      normalized.map((item) => ({
        ballotId,
        gameId: item.gameId,
        rank: item.rank,
        blurb: item.blurb?.trim() ? item.blurb.trim() : null,
      })),
    );
  }

  await db
    .delete(communityEditionBallotCategoryVotes)
    .where(eq(communityEditionBallotCategoryVotes.ballotId, ballotId));
  if (votes.length > 0) {
    await db.insert(communityEditionBallotCategoryVotes).values(
      votes.map((v) => ({
        ballotId,
        categoryId: v.categoryId,
        gameId: v.gameId,
      })),
    );
  }

  const view = await getEditionBallotForProfile(
    edition.id,
    input.profileId,
    db,
  );
  if (!view) return { error: "Could not load the saved ballot." };
  return view;
}
