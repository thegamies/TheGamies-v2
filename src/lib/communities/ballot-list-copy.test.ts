import { describe, expect, it } from "vitest";
import {
  ballotListCopyCanOverwrite,
  ballotListCopyHasWork,
  diffBallotListCopy,
  gotyListTitleForYear,
  isEditionBallotComplete,
} from "./ballot-list-copy";

const game = (
  rank: number,
  id: string,
): {
  rank: number;
  gameId: string;
  title: string;
  coverUrl: string | null;
} => ({
  rank,
  gameId: id,
  title: `Game ${id}`,
  coverUrl: null,
});

describe("isEditionBallotComplete", () => {
  it("needs a full top 10 and every award pick", () => {
    expect(
      isEditionBallotComplete({
        rankedCount: 10,
        requiredSiteCategoryIds: ["story", "art"],
        filledSiteCategoryIds: ["story", "art"],
        requiredCustomCategoryIds: ["community-pick"],
        filledCustomCategoryIds: ["community-pick"],
      }),
    ).toBe(true);
    expect(
      isEditionBallotComplete({
        rankedCount: 9,
        requiredSiteCategoryIds: [],
        filledSiteCategoryIds: [],
        requiredCustomCategoryIds: [],
        filledCustomCategoryIds: [],
      }),
    ).toBe(false);
    expect(
      isEditionBallotComplete({
        rankedCount: 10,
        requiredSiteCategoryIds: ["story"],
        filledSiteCategoryIds: [],
        requiredCustomCategoryIds: [],
        filledCustomCategoryIds: [],
      }),
    ).toBe(false);
    expect(
      isEditionBallotComplete({
        rankedCount: 10,
        requiredSiteCategoryIds: [],
        filledSiteCategoryIds: [],
        requiredCustomCategoryIds: ["community-pick"],
        filledCustomCategoryIds: [],
      }),
    ).toBe(false);
  });

  it("treats a top 10 with no awards as complete", () => {
    expect(
      isEditionBallotComplete({
        rankedCount: 10,
        requiredSiteCategoryIds: [],
        filledSiteCategoryIds: [],
        requiredCustomCategoryIds: [],
        filledCustomCategoryIds: [],
      }),
    ).toBe(true);
  });
});

describe("diffBallotListCopy", () => {
  const votes = [
    {
      categoryId: "story",
      label: "Best Story",
      gameId: "g1",
      title: "Expedition 33",
      coverUrl: null,
    },
    {
      categoryId: "art",
      label: "Best Art Direction",
      gameId: "g2",
      title: "Hades II",
      coverUrl: null,
    },
  ];

  it("creates the list and missing award picks when none exist", () => {
    const diff = diffBallotListCopy({
      hasGotyList: false,
      existingGames: [],
      existingCategoryVotes: [],
      rankedGames: [game(2, "b"), game(1, "a")],
      siteVotes: votes,
    });
    expect(diff.createList).toBe(true);
    expect(diff.games.map((g) => g.gameId)).toEqual(["a", "b"]);
    expect(diff.categories.map((c) => c.categoryId)).toEqual(["story", "art"]);
    expect(diff.rankingChanges).toEqual([]);
    expect(ballotListCopyHasWork(diff)).toBe(true);
  });

  it("skips an existing ranking and only adds awards they do not have", () => {
    const diff = diffBallotListCopy({
      hasGotyList: true,
      existingGames: [game(1, "a")],
      existingCategoryVotes: [
        {
          categoryId: "story",
          label: "Best Story",
          gameId: "g1",
          title: "Expedition 33",
          coverUrl: null,
        },
      ],
      rankedGames: [game(1, "a")],
      siteVotes: votes,
    });
    expect(diff.createList).toBe(false);
    expect(diff.games.map((g) => g.gameId)).toEqual(["a"]);
    expect(diff.categories.map((c) => c.categoryId)).toEqual(["art"]);
    expect(diff.rankingChanges).toEqual([]);
    expect(diff.categoryChanges).toEqual([]);
  });

  it("has no work when the list and awards already exist", () => {
    const diff = diffBallotListCopy({
      hasGotyList: true,
      existingGames: [game(1, "a")],
      existingCategoryVotes: votes,
      rankedGames: [game(1, "a")],
      siteVotes: votes,
    });
    expect(ballotListCopyHasWork(diff)).toBe(false);
    expect(ballotListCopyCanOverwrite(diff)).toBe(false);
  });

  it("names ranks and award picks that replace would overwrite", () => {
    const diff = diffBallotListCopy({
      hasGotyList: true,
      existingGames: [game(1, "old-1"), game(2, "old-2"), game(3, "keep-later")],
      existingCategoryVotes: [
        {
          categoryId: "story",
          label: "Best Story",
          gameId: "old-story",
          title: "Old Story",
          coverUrl: null,
        },
      ],
      rankedGames: [game(1, "a"), game(2, "b")],
      siteVotes: votes,
    });
    expect(diff.rankingChanges.map((row) => row.rank)).toEqual([1, 2]);
    expect(diff.rankingChanges[0]?.current?.gameId).toBe("old-1");
    expect(diff.rankingChanges[0]?.next?.gameId).toBe("a");
    expect(diff.extraGamesRemovedCount).toBe(1);
    expect(diff.categoryChanges.map((row) => row.categoryId)).toEqual(["story"]);
    expect(diff.categoryChanges[0]?.current?.title).toBe("Old Story");
    expect(diff.categories.map((c) => c.categoryId)).toEqual(["art"]);
    expect(ballotListCopyCanOverwrite(diff)).toBe(true);
  });
});

describe("gotyListTitleForYear", () => {
  it("matches owned GOTY titles", () => {
    expect(gotyListTitleForYear(2026)).toBe("2026 Game of the Year");
  });
});
