import { describe, expect, it } from "vitest";
import { editionResultsHref } from "./edition-results-href";
import {
  aggregateEditionCategories,
  aggregateEditionGoty,
  editionBoardLabel,
  parseEditionResultMode,
  parseEditionResultsView,
  placeEditionCategoryTallies,
  freezeRowsKeptAfterHostsRebuild,
  hostsRebuildStorageMode,
  placeEditionGotyTallies,
  resolveEditionHostSettings,
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

describe("hosts-only freeze rebuild", () => {
  it("replaces voices rows and keeps community rows", () => {
    expect(hostsRebuildStorageMode()).toBe("voices");
    expect(
      freezeRowsKeptAfterHostsRebuild([
        { mode: "community", place: 1 },
        { mode: "voices", place: 1 },
        { mode: "community", place: 2 },
      ]),
    ).toEqual([
      { mode: "community", place: 1 },
      { mode: "community", place: 2 },
    ]);
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

  it("serializes Comparison as view=comparison", () => {
    expect(editionResultsHref("demo", 2026, { view: "comparison" })).toBe(
      "/communities/demo/edition/2026?view=comparison",
    );
    expect(
      editionResultsHref("demo", 2026, {
        view: "comparison",
        source: "live",
      }),
    ).toBe("/communities/demo/edition/2026?view=comparison&source=live");
  });

  it("serializes Reveal explicitly so bare URL stays the entrance", () => {
    expect(editionResultsHref("demo", 2026, { view: "reveal" })).toBe(
      "/communities/demo/edition/2026?view=reveal",
    );
    expect(editionResultsHref("demo", 2026, { view: "entrance" })).toBe(
      "/communities/demo/edition/2026",
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

  it("serializes Full standings pages", () => {
    expect(
      editionResultsHref("demo", 2026, { view: "standings", page: 2 }),
    ).toBe("/communities/demo/edition/2026?view=standings&page=2");
  });
});

describe("parseEditionResultsView", () => {
  it("defaults to reveal for unknown values and accepts entrance", () => {
    expect(parseEditionResultsView(undefined)).toBe("reveal");
    expect(parseEditionResultsView("entrance")).toBe("entrance");
    expect(parseEditionResultsView("comparison")).toBe("comparison");
    expect(parseEditionResultsView("settings")).toBe("settings");
    expect(parseEditionResultsView("show")).toBe("show");
    expect(parseEditionResultsView("hosts")).toBe("hosts");
    expect(parseEditionResultsView("preview")).toBe("preview");
  });

  it("resolves settings panels and legacy host tool views", () => {
    expect(resolveEditionHostSettings("settings", undefined)).toEqual({
      view: "settings",
      panel: "edition",
    });
    expect(resolveEditionHostSettings("settings", "hosts")).toEqual({
      view: "settings",
      panel: "hosts",
    });
    expect(resolveEditionHostSettings("settings", "preview")).toEqual({
      view: "settings",
      panel: "preview",
    });
    expect(resolveEditionHostSettings("hosts", undefined)).toEqual({
      view: "settings",
      panel: "hosts",
    });
    expect(resolveEditionHostSettings("preview", undefined)).toEqual({
      view: "settings",
      panel: "preview",
    });
  });
});

describe("parseEditionShowSource", () => {
  it("defaults to demo and requires live for real freeze", async () => {
    const { parseEditionShowSource } = await import("./edition-results-scoring");
    expect(parseEditionShowSource(undefined)).toBe("demo");
    expect(parseEditionShowSource("demo")).toBe("demo");
    expect(parseEditionShowSource("live")).toBe("live");
    expect(parseEditionShowSource("real")).toBe("demo");
  });
});

describe("editionHostRevealShowHref", () => {
  it("uses view=show and sets source=live for freeze", async () => {
    const { editionHostRevealShowHref } = await import("./edition-results-href");
    expect(editionHostRevealShowHref("demo", 2026)).toBe(
      "/communities/demo/edition/2026?view=show",
    );
    expect(editionHostRevealShowHref("demo", 2026, { source: "live" })).toBe(
      "/communities/demo/edition/2026?view=show&source=live",
    );
    expect(
      editionHostRevealShowHref("demo", 2026, {
        view: "overview",
        source: "live",
      }),
    ).toBe("/communities/demo/edition/2026?view=results&source=live");
    expect(
      editionHostRevealShowHref("demo", 2026, {
        view: "comparison",
        source: "live",
      }),
    ).toBe("/communities/demo/edition/2026?view=comparison&source=live");
    expect(
      editionHostRevealShowHref("demo", 2026, {
        view: "standings",
        source: "demo",
      }),
    ).toBe("/communities/demo/edition/2026?view=standings");
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
