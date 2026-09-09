import { and, eq, isNull } from "drizzle-orm";
import {
  communityCustomCategories,
  communityEditionBallots,
  covers,
  createDb,
  games,
  listCategoryVotes,
  type Db,
} from "@thegamies/db";
import {
  canSubmitEditionBallot,
  getEditionBallotForProfile,
} from "@/lib/communities/ballots";
import {
  ballotListCopyCanOverwrite,
  ballotListCopyHasWork,
  diffBallotListCopy,
  gotyListTitleForYear,
  isEditionBallotComplete,
  type BallotListCopyCategory,
  type BallotListCopyGame,
  type BallotListCopyMode,
  type BallotListCopyPreview,
} from "@/lib/communities/ballot-list-copy";
import { listEditionAwardCategories } from "@/lib/communities/edition-categories";
import { getEditionByCommunityYear } from "@/lib/communities/editions";
import { getCommunityBySlug } from "@/lib/communities/service";
import {
  insertMissingCategoryVotesForList,
  upsertCategoryVotesForList,
} from "@/lib/live-aggregate/contrib";
import {
  parseStoredRankVisibility,
  type ListRankVisibility,
} from "@/lib/lists/schema";
import {
  createDraft,
  getOwnedGotyForYear,
  getOwnedGotyItemsForYear,
  replaceItems,
  syncLiveAggregateForOwnedList,
} from "@/lib/lists/service";

function getDb(): Db {
  return createDb();
}

function coverUrlFromImageId(imageId: string | null): string | null {
  return imageId
    ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${imageId}.jpg`
    : null;
}

export async function markEditionBallotCopyPrompted(
  ballotId: string,
  db: Db = getDb(),
): Promise<void> {
  await db
    .update(communityEditionBallots)
    .set({ listCopyPromptedAt: new Date() })
    .where(
      and(
        eq(communityEditionBallots.id, ballotId),
        isNull(communityEditionBallots.listCopyPromptedAt),
      ),
    );
}

async function loadCopyContext(
  slug: string,
  year: number,
  profileId: string,
  db: Db,
) {
  const detail = await getCommunityBySlug(slug, profileId, db);
  if (!detail) return { ok: false as const, error: "Community not found." };
  if (!canSubmitEditionBallot(detail.viewerRole)) {
    return {
      ok: false as const,
      error: "Join this community to submit a ballot.",
    };
  }
  const edition = await getEditionByCommunityYear(detail.id, year, db);
  if (!edition) return { ok: false as const, error: "Event not found." };
  const ballot = await getEditionBallotForProfile(edition.id, profileId, db);
  if (!ballot) return { ok: false as const, error: "Save the ballot first." };
  const [siteCategories, customRows] = await Promise.all([
    listEditionAwardCategories(edition.id, db),
    db
      .select({ id: communityCustomCategories.id })
      .from(communityCustomCategories)
      .where(eq(communityCustomCategories.editionId, edition.id)),
  ]);
  const complete = isEditionBallotComplete({
    rankedCount: ballot.items.length,
    requiredSiteCategoryIds: siteCategories.map((c) => c.id),
    filledSiteCategoryIds: ballot.categoryVotes.map((v) => v.categoryId),
    requiredCustomCategoryIds: customRows.map((c) => c.id),
    filledCustomCategoryIds: ballot.customCategoryVotes.map(
      (v) => v.categoryId,
    ),
  });
  return {
    ok: true as const,
    detail,
    ballot,
    siteCategories,
    complete,
  };
}

async function existingListCategoryVotes(
  listId: string,
  db: Db,
): Promise<BallotListCopyCategory[]> {
  const rows = await db
    .select({
      categoryId: listCategoryVotes.categoryId,
      gameId: listCategoryVotes.gameId,
      title: games.title,
      coverImageId: covers.imageId,
    })
    .from(listCategoryVotes)
    .innerJoin(games, eq(games.id, listCategoryVotes.gameId))
    .leftJoin(covers, eq(covers.igdbId, games.coverIgdbId))
    .where(eq(listCategoryVotes.listId, listId));
  return rows.map((row) => ({
    categoryId: row.categoryId,
    label: row.categoryId,
    gameId: row.gameId,
    title: row.title,
    coverUrl: coverUrlFromImageId(row.coverImageId),
  }));
}

async function existingListState(
  profileId: string,
  year: number,
  db: Db,
): Promise<{
  hasGotyList: boolean;
  existingGames: BallotListCopyGame[];
  existingCategoryVotes: BallotListCopyCategory[];
  list: Awaited<ReturnType<typeof getOwnedGotyForYear>>;
}> {
  const list = await getOwnedGotyForYear(profileId, year, db);
  if (!list) {
    return {
      hasGotyList: false,
      existingGames: [],
      existingCategoryVotes: [],
      list: null,
    };
  }
  const [items, votes] = await Promise.all([
    getOwnedGotyItemsForYear(profileId, year, { db }),
    existingListCategoryVotes(list.id, db),
  ]);
  return {
    hasGotyList: true,
    existingGames: (items ?? []).map((item) => ({
      rank: item.rank,
      gameId: item.gameId,
      title: item.title,
      coverUrl: item.coverUrl,
    })),
    existingCategoryVotes: votes,
    list,
  };
}

function previewFromBallot(
  year: number,
  siteCategories: Array<{ id: string; label: string }>,
  ballot: {
    items: Array<{
      gameId: string;
      rank: number;
      title: string;
      coverUrl: string | null;
    }>;
    categoryVotes: Array<{
      categoryId: string;
      gameId: string;
      title: string;
      coverUrl: string | null;
    }>;
  },
  existing: {
    hasGotyList: boolean;
    existingGames: BallotListCopyGame[];
    existingCategoryVotes: BallotListCopyCategory[];
  },
): BallotListCopyPreview {
  const labels = new Map(siteCategories.map((c) => [c.id, c.label]));
  const siteVotes: BallotListCopyCategory[] = ballot.categoryVotes.map(
    (vote) => ({
      categoryId: vote.categoryId,
      label: labels.get(vote.categoryId) ?? "Award",
      gameId: vote.gameId,
      title: vote.title,
      coverUrl: vote.coverUrl,
    }),
  );
  const labeledExisting = existing.existingCategoryVotes.map((vote) => ({
    ...vote,
    label: labels.get(vote.categoryId) ?? vote.label,
  }));
  const diff = diffBallotListCopy({
    hasGotyList: existing.hasGotyList,
    existingGames: existing.existingGames,
    existingCategoryVotes: labeledExisting,
    rankedGames: ballot.items.map((item) => ({
      rank: item.rank,
      gameId: item.gameId,
      title: item.title,
      coverUrl: item.coverUrl,
    })),
    siteVotes,
  });
  return {
    year,
    listTitle: gotyListTitleForYear(year),
    ...diff,
  };
}

async function previewFromContext(
  year: number,
  profileId: string,
  ctx: Extract<Awaited<ReturnType<typeof loadCopyContext>>, { ok: true }>,
  db: Db,
): Promise<BallotListCopyPreview> {
  const existing = await existingListState(profileId, year, db);
  return previewFromBallot(year, ctx.siteCategories, ctx.ballot, existing);
}

export async function previewEditionBallotListCopy(input: {
  slug: string;
  year: number;
  profileId: string;
  db?: Db;
}): Promise<BallotListCopyPreview | null> {
  try {
    const db = input.db ?? getDb();
    const ctx = await loadCopyContext(
      input.slug,
      input.year,
      input.profileId,
      db,
    );
    if (!ctx.ok) return null;
    if (ctx.ballot.listCopyPromptedAt || !ctx.complete) return null;
    const preview = await previewFromContext(
      input.year,
      input.profileId,
      ctx,
      db,
    );
    if (!ballotListCopyHasWork(preview)) return null;
    return preview;
  } catch {
    return null;
  }
}

export async function previewEditionBallotListExport(input: {
  slug: string;
  year: number;
  profileId: string;
  db?: Db;
}): Promise<BallotListCopyPreview | { error: string }> {
  try {
    const db = input.db ?? getDb();
    const ctx = await loadCopyContext(
      input.slug,
      input.year,
      input.profileId,
      db,
    );
    if (!ctx.ok) return { error: ctx.error };
    if (
      ctx.ballot.items.length === 0 &&
      ctx.ballot.categoryVotes.length === 0
    ) {
      return { error: "Add games or award picks before exporting." };
    }
    return await previewFromContext(input.year, input.profileId, ctx, db);
  } catch {
    return { error: "Could not open your Game of the Year list." };
  }
}

export async function dismissEditionBallotListCopy(input: {
  slug: string;
  year: number;
  profileId: string;
  db?: Db;
}): Promise<{ ok: true } | { error: string }> {
  try {
    const db = input.db ?? getDb();
    const ctx = await loadCopyContext(
      input.slug,
      input.year,
      input.profileId,
      db,
    );
    if (!ctx.ok) return { error: ctx.error };
    await markEditionBallotCopyPrompted(ctx.ballot.ballotId, db);
    return { ok: true };
  } catch {
    return { ok: true };
  }
}

export async function applyEditionBallotListCopy(input: {
  slug: string;
  year: number;
  profileId: string;
  rankVisibility?: ListRankVisibility;
  mode?: BallotListCopyMode;
  manual?: boolean;
  db?: Db;
}): Promise<{ ok: true } | { error: string }> {
  try {
    return await applyEditionBallotListCopyUnsafe(input);
  } catch {
    return { error: "Could not add those picks to your list." };
  }
}

async function applyEditionBallotListCopyUnsafe(input: {
  slug: string;
  year: number;
  profileId: string;
  rankVisibility?: ListRankVisibility;
  mode?: BallotListCopyMode;
  manual?: boolean;
  db?: Db;
}): Promise<{ ok: true } | { error: string }> {
  const db = input.db ?? getDb();
  const mode = input.mode ?? "missing";
  const ctx = await loadCopyContext(input.slug, input.year, input.profileId, db);
  if (!ctx.ok) return { error: ctx.error };
  if (!input.manual && ctx.ballot.listCopyPromptedAt) return { ok: true };
  if (!input.manual && !ctx.complete) {
    return { error: "Finish the ballot before saving it to your list." };
  }
  if (
    input.manual &&
    ctx.ballot.items.length === 0 &&
    ctx.ballot.categoryVotes.length === 0
  ) {
    return { error: "Add games or award picks before exporting." };
  }

  const existing = await existingListState(input.profileId, input.year, db);
  let list = existing.list;
  const preview = previewFromBallot(
    input.year,
    ctx.siteCategories,
    ctx.ballot,
    existing,
  );
  const overwrite = mode === "overwrite" && !preview.createList;
  if (overwrite && !ballotListCopyCanOverwrite(preview)) {
    return { ok: true };
  }
  if (!overwrite && !ballotListCopyHasWork(preview)) {
    if (!input.manual) {
      await markEditionBallotCopyPrompted(ctx.ballot.ballotId, db);
    }
    return { ok: true };
  }

  if (preview.createList) {
    const created = await createDraft(
      {
        listType: "goty",
        year: input.year,
        rankVisibility: parseStoredRankVisibility(input.rankVisibility),
      },
      { profileId: input.profileId },
      db,
    );
    if ("error" in created) {
      list = await getOwnedGotyForYear(input.profileId, input.year, db);
      if (!list) return { error: created.error };
    } else {
      list = created.list;
    }
  }

  if (!list) {
    return { error: "Could not open your Game of the Year list." };
  }

  if ((preview.createList || overwrite) && ctx.ballot.items.length > 0) {
    const ranked = ctx.ballot.items.map((item) => ({
      gameId: item.gameId,
      rank: item.rank,
    }));
    const written = await replaceItems(
      list.publicId,
      ranked,
      { profileId: input.profileId },
      db,
    );
    if ("error" in written) return { error: written.error };
    list =
      (await getOwnedGotyForYear(input.profileId, input.year, db)) ?? list;
  }

  const siteVotes = ctx.ballot.categoryVotes.map((vote) => ({
    categoryId: vote.categoryId,
    gameId: vote.gameId,
  }));
  if (overwrite) {
    const written = await upsertCategoryVotesForList(list.id, siteVotes, db);
    if ("error" in written) return written;
  } else if (preview.categories.length > 0) {
    const added = await insertMissingCategoryVotesForList(
      list.id,
      preview.categories.map((vote) => ({
        categoryId: vote.categoryId,
        gameId: vote.gameId,
      })),
      db,
    );
    if ("error" in added) return added;
  }

  await syncLiveAggregateForOwnedList(list, db);
  await markEditionBallotCopyPrompted(ctx.ballot.ballotId, db);
  return { ok: true };
}
