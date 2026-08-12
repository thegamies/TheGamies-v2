import { describe, expect, it } from "vitest";
import {
  aggregateEditionCategories,
  aggregateEditionGoty,
  parseEditionResultMode,
  parseEditionResultsView,
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

describe("parseEditionResultsView", () => {
  it("defaults to overview and accepts standings, categories, voters, and ballot", () => {
    expect(parseEditionResultsView(undefined)).toBe("overview");
    expect(parseEditionResultsView("overview")).toBe("overview");
    expect(parseEditionResultsView("standings")).toBe("standings");
    expect(parseEditionResultsView("categories")).toBe("categories");
    expect(parseEditionResultsView("voters")).toBe("voters");
    expect(parseEditionResultsView("ballot")).toBe("ballot");
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
