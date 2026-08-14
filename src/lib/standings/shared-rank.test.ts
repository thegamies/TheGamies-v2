import { describe, expect, it } from "vitest";
import {
  groupByRank,
  parseSharedRankMode,
  ranksForSortedPage,
  ranksForSortedScores,
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
