import { describe, expect, it } from "vitest";
import { editionResultsHref } from "./edition-results-href";
import {
  aggregateEditionCategories,
  aggregateEditionGoty,
  editionBoardLabel,
  parseEditionResultMode,
  parseEditionResultsView,
  placeEditionCategoryTallies,
  placeEditionGotyTallies,
  storageModeFor,
  type GameMeta,
} from "./edition-results-scoring";

const games = new Map<string, GameMeta>([
  [
    "g1",
    {
      gameId: "g1",
      slug: "one",
      title: "One",
      gameYear: 2026,
      coverUrl: null,
    },
  ],
  [
    "g2",
    {
      gameId: "g2",
      slug: "two",
      title: "Two",
      gameYear: 2026,
      coverUrl: null,
    },
  ],
]);

describe("editionBoardLabel", () => {
  it("uses Hosts for the voices board", () => {
    expect(editionBoardLabel("community")).toBe("Community");
    expect(editionBoardLabel("voices")).toBe("Hosts");
  });
});

describe("storageModeFor / parseEditionResultMode", () => {
  it("maps combined to community storage and hides combined in public parse", () => {
    expect(storageModeFor("combined")).toBe("community");
    expect(storageModeFor("community")).toBe("community");
    expect(storageModeFor("voices")).toBe("voices");
    expect(parseEditionResultMode("combined")).toBe("community");
    expect(parseEditionResultMode(undefined)).toBe("community");
    expect(parseEditionResultMode("voices")).toBe("voices");
  });
});

describe("parseEditionRankMode", () => {
  it("parses stored competition vs dense numbering", async () => {
    const { parseEditionRankMode } = await import("./edition-results-scoring");
    expect(parseEditionRankMode(undefined)).toBe("competition");
    expect(parseEditionRankMode("dense")).toBe("dense");
  });
});

describe("editionResultsHref", () => {
  it("serializes the Results tab as view=results", () => {
    expect(editionResultsHref("demo", 2026, { view: "overview" })).toBe(
      "/communities/demo/edition/2026?view=results",
    );
  });

  it("keeps view and Voices mode when switching years", () => {
    expect(
      editionResultsHref("demo", 2025, {
        view: "overview",
        mode: "voices",
      }),
    ).toBe("/communities/demo/edition/2025?mode=voices&view=results");
  });
});

describe("parseEditionResultsView", () => {
  it("defaults to reveal and accepts results, overview, standings, categories, voters, ballot, and settings", () => {
    expect(parseEditionResultsView(undefined)).toBe("reveal");
    expect(parseEditionResultsView("reveal")).toBe("reveal");
    expect(parseEditionResultsView("overview")).toBe("overview");
    expect(parseEditionResultsView("results")).toBe("overview");
    expect(parseEditionResultsView("standings")).toBe("standings");
    expect(parseEditionResultsView("categories")).toBe("categories");
    expect(parseEditionResultsView("voters")).toBe("voters");
    expect(parseEditionResultsView("ballot")).toBe("ballot");
    expect(parseEditionResultsView("settings")).toBe("settings");
  });
});

describe("placeEditionGotyTallies / placeEditionCategoryTallies", () => {
  it("orders GOTY by points, #1s, appearances, then gameId", () => {
    const rows = placeEditionGotyTallies([
      {
        gameId: "g2",
        slug: "two",
        title: "Two",
        gameYear: 2026,
        coverUrl: null,
        points: 10,
        firstPlaceVotes: 1,
        appearances: 1,
      },
      {
        gameId: "g1",
        slug: "one",
        title: "One",
        gameYear: 2026,
        coverUrl: null,
        points: 10,
        firstPlaceVotes: 1,
        appearances: 2,
      },
    ]);
    expect(rows.map((r) => [r.gameId, r.place])).toEqual([
      ["g1", 1],
      ["g2", 2],
    ]);
  });

  it("orders category tallies per award by votes then gameId", () => {
    const rows = placeEditionCategoryTallies([
      {
        gameId: "g2",
        slug: "two",
        title: "Two",
        gameYear: 2026,
        coverUrl: null,
        categoryId: "best",
        votes: 1,
      },
      {
        gameId: "g1",
        slug: "one",
        title: "One",
        gameYear: 2026,
        coverUrl: null,
        categoryId: "best",
        votes: 1,
      },
    ]);
    expect(rows[0]?.gameId).toBe("g1");
    expect(rows[0]?.place).toBe(1);
    expect(rows[1]?.gameId).toBe("g2");
    expect(rows[1]?.place).toBe(2);
  });
});

describe("aggregateEditionGoty", () => {
  it("scores top 10 with pointsForRank and matches community to all ballots", () => {
    const lines = [
      { profileId: "a", gameId: "g1", rank: 1 },
      { profileId: "a", gameId: "g2", rank: 2 },
      { profileId: "b", gameId: "g1", rank: 1 },
      { profileId: "v", gameId: "g2", rank: 1 },
    ];
    const community = aggregateEditionGoty(lines, games);
    expect(community[0]?.gameId).toBe("g1");
    expect(community[0]?.points).toBe(20);
    expect(community[0]?.firstPlaceVotes).toBe(2);
    expect(community[1]?.gameId).toBe("g2");
    expect(community[1]?.points).toBe(19);

    const voices = aggregateEditionGoty(lines, games, new Set(["v"]));
    expect(voices).toHaveLength(1);
    expect(voices[0]?.gameId).toBe("g2");
    expect(voices[0]?.points).toBe(10);
  });

  it("ignores ranks beyond 10", () => {
    const rows = aggregateEditionGoty(
      [{ profileId: "a", gameId: "g1", rank: 11 }],
      games,
    );
    expect(rows).toHaveLength(0);
  });
});

describe("aggregateEditionCategories", () => {
  it("counts plurality per category with optional voice filter", () => {
    const votes = [
      { profileId: "a", categoryId: "best", gameId: "g1" },
      { profileId: "b", categoryId: "best", gameId: "g1" },
      { profileId: "v", categoryId: "best", gameId: "g2" },
    ];
    const all = aggregateEditionCategories(votes, games);
    expect(all.find((r) => r.gameId === "g1")?.votes).toBe(2);
    expect(all.find((r) => r.gameId === "g1")?.place).toBe(1);

    const voices = aggregateEditionCategories(votes, games, new Set(["v"]));
    expect(voices).toHaveLength(1);
    expect(voices[0]?.gameId).toBe("g2");
  });
});
