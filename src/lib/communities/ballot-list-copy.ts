import { EDITION_BALLOT_MAX_ITEMS } from "@/lib/communities/ballot-schema";

export type BallotListCopyGame = {
  rank: number;
  gameId: string;
  title: string;
  coverUrl: string | null;
};

export type BallotListCopyCategory = {
  categoryId: string;
  label: string;
  gameId: string;
  title: string;
  coverUrl: string | null;
};

export type BallotListCopyRankChange = {
  rank: number;
  current: BallotListCopyGame | null;
  next: BallotListCopyGame | null;
};

export type BallotListCopyCategoryChange = {
  categoryId: string;
  label: string;
  current: {
    gameId: string;
    title: string;
    coverUrl: string | null;
  } | null;
  next: {
    gameId: string;
    title: string;
    coverUrl: string | null;
  };
};

export type BallotListCopyDiff = {
  createList: boolean;
  games: BallotListCopyGame[];
  categories: BallotListCopyCategory[];
  existingGameCount: number;
  extraGamesRemovedCount: number;
  rankingChanges: BallotListCopyRankChange[];
  categoryChanges: BallotListCopyCategoryChange[];
};

export type BallotListCopyMode = "missing" | "overwrite";

export type BallotListCopyPreview = {
  year: number;
  listTitle: string;
} & BallotListCopyDiff;

export function gotyListTitleForYear(year: number): string {
  return `${year} Game of the Year`;
}

export function isEditionBallotComplete(input: {
  rankedCount: number;
  maxRanked?: number;
  requiredSiteCategoryIds: readonly string[];
  filledSiteCategoryIds: readonly string[];
  requiredCustomCategoryIds: readonly string[];
  filledCustomCategoryIds: readonly string[];
}): boolean {
  const max = input.maxRanked ?? EDITION_BALLOT_MAX_ITEMS;
  if (input.rankedCount !== max) return false;
  const siteFilled = new Set(input.filledSiteCategoryIds);
  for (const id of input.requiredSiteCategoryIds) {
    if (!siteFilled.has(id)) return false;
  }
  const customFilled = new Set(input.filledCustomCategoryIds);
  for (const id of input.requiredCustomCategoryIds) {
    if (!customFilled.has(id)) return false;
  }
  return true;
}

export function diffBallotListCopy(input: {
  hasGotyList: boolean;
  existingGames?: readonly BallotListCopyGame[];
  existingCategoryVotes?: readonly BallotListCopyCategory[];
  existingCategoryIds?: readonly string[];
  rankedGames: readonly BallotListCopyGame[];
  siteVotes: readonly BallotListCopyCategory[];
}): BallotListCopyDiff {
  const existingGames = [...(input.existingGames ?? [])].sort(
    (a, b) => a.rank - b.rank,
  );
  const existingVotes =
    input.existingCategoryVotes ??
    (input.existingCategoryIds ?? []).map((categoryId) => ({
      categoryId,
      label: categoryId,
      gameId: "",
      title: "",
      coverUrl: null,
    }));
  const existingCatIds = new Set(existingVotes.map((vote) => vote.categoryId));
  const existingByCat = new Map(
    existingVotes.map((vote) => [vote.categoryId, vote]),
  );
  const rankedGames = [...input.rankedGames].sort((a, b) => a.rank - b.rank);
  const categories = input.siteVotes.filter(
    (vote) => !existingCatIds.has(vote.categoryId),
  );
  const createList = !input.hasGotyList;
  const existingByRank = new Map(existingGames.map((game) => [game.rank, game]));
  const nextByRank = new Map(rankedGames.map((game) => [game.rank, game]));
  const rankingChanges: BallotListCopyRankChange[] = [];
  const maxComparedRank = Math.max(
    rankedGames[rankedGames.length - 1]?.rank ?? 0,
    0,
  );
  for (let rank = 1; rank <= maxComparedRank; rank += 1) {
    const current = existingByRank.get(rank) ?? null;
    const next = nextByRank.get(rank) ?? null;
    if (!current && !next) continue;
    if (current?.gameId === next?.gameId) continue;
    rankingChanges.push({ rank, current, next });
  }
  const extraGamesRemovedCount = existingGames.filter(
    (game) => game.rank > maxComparedRank,
  ).length;
  const categoryChanges: BallotListCopyCategoryChange[] = [];
  for (const vote of input.siteVotes) {
    const current = existingByCat.get(vote.categoryId) ?? null;
    if (!current || current.gameId === "" || current.gameId === vote.gameId) {
      continue;
    }
    categoryChanges.push({
      categoryId: vote.categoryId,
      label: vote.label,
      current: {
        gameId: current.gameId,
        title: current.title,
        coverUrl: current.coverUrl,
      },
      next: {
        gameId: vote.gameId,
        title: vote.title,
        coverUrl: vote.coverUrl,
      },
    });
  }
  return {
    createList,
    games: rankedGames,
    categories,
    existingGameCount: createList ? 0 : existingGames.length,
    extraGamesRemovedCount: createList ? 0 : extraGamesRemovedCount,
    rankingChanges: createList ? [] : rankingChanges,
    categoryChanges: createList ? [] : categoryChanges,
  };
}

export function ballotListCopyHasWork(
  diff: Pick<BallotListCopyDiff, "createList" | "categories">,
): boolean {
  return diff.createList || diff.categories.length > 0;
}

export function ballotListCopyCanOverwrite(
  diff: Pick<
    BallotListCopyDiff,
    | "createList"
    | "categories"
    | "rankingChanges"
    | "categoryChanges"
    | "extraGamesRemovedCount"
  >,
): boolean {
  if (diff.createList) return false;
  return (
    diff.rankingChanges.length > 0 ||
    diff.extraGamesRemovedCount > 0 ||
    diff.categoryChanges.length > 0 ||
    diff.categories.length > 0
  );
}
