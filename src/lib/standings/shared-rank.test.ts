import { describe, expect, it } from "vitest";
import {
  groupByRank,
  parseSharedRankMode,
  ranksForSortedPage,
  ranksForSortedScores,
  scoreCutoffThroughRank,
  withDisplayRanks,
} from "./shared-rank";

describe("parseSharedRankMode", () => {
  it("defaults to competition", () => {
    expect(parseSharedRankMode(undefined)).toBe("competition");
    expect(parseSharedRankMode("competition")).toBe("competition");
    expect(parseSharedRankMode("dense")).toBe("dense");
    expect(parseSharedRankMode("span")).toBe("competition");
  });
});

describe("ranksForSortedScores", () => {
  it("assigns competition 1–1–3 for a two-way tie then a skip", () => {
    expect(ranksForSortedScores([100, 100, 50], "competition")).toEqual([
      1, 1, 3,
    ]);
  });

  it("assigns dense 1–1–2 with no skip", () => {
    expect(ranksForSortedScores([100, 100, 50], "dense")).toEqual([1, 1, 2]);
  });

  it("handles a three-way tie", () => {
    expect(ranksForSortedScores([40, 40, 40, 10], "competition")).toEqual([
      1, 1, 1, 4,
    ]);
    expect(ranksForSortedScores([40, 40, 40, 10], "dense")).toEqual([
      1, 1, 1, 2,
    ]);
  });
});

describe("scoreCutoffThroughRank", () => {
  it("keeps a competition tie that extends past the first 10 places", () => {
    const scores = [20, 19, 18, 17, 16, 15, 14, 13, 12, ...Array(25).fill(5), 1];
    expect(scoreCutoffThroughRank(scores, 10, "competition")).toBe(5);
    expect(scores.filter((s) => s >= 5)).toHaveLength(34);
  });

  it("keeps dense ranks 1–10 when early groups are large ties", () => {
    const groups = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 1];
    const scores = groups.flatMap((points, i) =>
      Array(i === 9 ? 5 : 4).fill(points),
    );
    expect(scoreCutoffThroughRank(scores, 10, "dense")).toBe(10);
    expect(scores.filter((s) => s >= 10)).toHaveLength(41);
  });

  it("returns the lowest score when there are fewer than maxRank rows", () => {
    expect(scoreCutoffThroughRank([9, 8, 7], 10, "competition")).toBe(7);
    expect(scoreCutoffThroughRank([9, 9, 8], 10, "dense")).toBe(8);
  });

  it("keeps a category Top 3 competition tie that extends past place 3", () => {
    const votes = [12, 9, 4, 4, 4, 4, 1];
    expect(scoreCutoffThroughRank(votes, 3, "competition")).toBe(4);
    expect(votes.filter((v) => v >= 4)).toHaveLength(6);
  });

  it("matches RANK()/DENSE_RANK window filter for category top-N", () => {
    // Same predicate as SQL window filter in getEditionCategoryResults.
    const votes = [12, 9, 4, 4, 4, 1];
    const competition = ranksForSortedScores(votes, "competition");
    expect(competition.filter((r) => r <= 3)).toEqual([1, 2, 3, 3, 3]);
    const dense = ranksForSortedScores(votes, "dense");
    expect(dense.filter((r) => r <= 3)).toEqual([1, 2, 3, 3, 3]);
  });
});

describe("ranksForSortedPage", () => {
  it("continues a competition tie that started on the previous page", () => {
    // Unique places 49–51 tied; page size 50, this page starts at offset 50
    // (the third tied game). Next distinct score is unique place 52.
    expect(
      ranksForSortedPage([40, 30], {
        offset: 50,
        firstGroupRank: 49,
        mode: "competition",
      }),
    ).toEqual([49, 52]);
  });

  it("skips to offset + index + 1 when two tied games remain on the page", () => {
    expect(
      ranksForSortedPage([40, 40, 30], {
        offset: 50,
        firstGroupRank: 49,
        mode: "competition",
      }),
    ).toEqual([49, 49, 53]);
  });

  it("continues a dense tie then increments by one", () => {
    expect(
      ranksForSortedPage([40, 40, 30], {
        offset: 50,
        firstGroupRank: 49,
        mode: "dense",
      }),
    ).toEqual([49, 49, 50]);
  });
});

describe("withDisplayRanks / groupByRank", () => {
  it("labels rows and groups consecutive equal ranks", () => {
    const labeled = withDisplayRanks(
      [{ id: "a", points: 10 }, { id: "b", points: 10 }, { id: "c", points: 4 }],
      (r) => r.points,
      "competition",
    );
    expect(labeled.map((r) => r.rank)).toEqual([1, 1, 3]);
    expect(groupByRank(labeled).map((g) => [g.rank, g.rows.length])).toEqual([
      [1, 2],
      [3, 1],
    ]);
  });
});
