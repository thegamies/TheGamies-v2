import { describe, expect, it } from "vitest";
import {
  hasGameGotyPresence,
  redactGameGotyYearRanking,
  type GameGotyRankings,
  type GameGotyYearRanking,
} from "./game-rankings";

const revealed: GameGotyYearRanking = {
  year: 2026,
  rank: 4,
  votes: 12,
  score: 86,
  votesByRank: [5, 3, 2, 1, 1, 0, 0, 0, 0, 0],
  detailedStatsRevealed: true,
};

describe("redactGameGotyYearRanking", () => {
  it("keeps rank and hides votes when unrevealed", () => {
    const redacted = redactGameGotyYearRanking({
      ...revealed,
      detailedStatsRevealed: false,
    });
    expect(redacted.rank).toBe(4);
    expect(redacted.year).toBe(2026);
    expect(redacted.votes).toBeNull();
    expect(redacted.score).toBeNull();
    expect(redacted.votesByRank).toBeNull();
  });

  it("keeps scores when revealed", () => {
    expect(redactGameGotyYearRanking(revealed).score).toBe(86);
    expect(redactGameGotyYearRanking(revealed).votesByRank?.[0]).toBe(5);
  });
});

describe("hasGameGotyPresence", () => {
  it("treats a public rank as presence", () => {
    const stats: GameGotyRankings = {
      byYear: [
        {
          ...revealed,
          detailedStatsRevealed: false,
          votes: null,
          score: null,
          votesByRank: null,
        },
      ],
      viaParent: null,
    };
    expect(hasGameGotyPresence(stats)).toBe(true);
  });

  it("ignores an empty year list", () => {
    expect(hasGameGotyPresence({ byYear: [], viaParent: null })).toBe(false);
  });
});
