import { describe, expect, it } from "vitest";
import {
  buildSeedCategoryVotes,
  weightForRatedGame,
  weightForTopRank,
  weightedSample,
} from "./seed-standings";

describe("weightForRatedGame", () => {
  it("raises high-rated weight when bias is positive", () => {
    const high = weightForRatedGame({ rating: 95, popularity: 1000 }, 80);
    const low = weightForRatedGame({ rating: 40, popularity: 1000 }, 80);
    expect(high).toBeGreaterThan(low);
  });

  it("raises lower-rated weight when bias is negative", () => {
    const high = weightForRatedGame({ rating: 95, popularity: 1000 }, -80);
    const low = weightForRatedGame({ rating: 40, popularity: 1000 }, -80);
    expect(low).toBeGreaterThan(high);
  });
});

describe("weightedSample", () => {
  it("returns unique picks of requested size", () => {
    const items = Array.from({ length: 20 }, (_, i) => i);
    const picks = weightedSample(items, 5, () => 1);
    expect(picks).toHaveLength(5);
    expect(new Set(picks).size).toBe(5);
  });
});

describe("weightForTopRank", () => {
  it("concentrates weight on the top ranks", () => {
    const r1 = weightForTopRank(1);
    const r2 = weightForTopRank(2);
    const r3 = weightForTopRank(3);
    const r10 = weightForTopRank(10);
    expect(r1).toBeGreaterThan(r2 * 4);
    expect(r2).toBeGreaterThan(r3);
    expect(r1).toBeGreaterThan(r10 * 20);
  });
});

describe("buildSeedCategoryVotes", () => {
  it("votes every category when participation is 1", () => {
    const votes = buildSeedCategoryVotes(
      [{ id: "a" }, { id: "b" }, { id: "c" }],
      [{ id: "g1" }, { id: "g2" }, { id: "g3" }],
      { participationRate: 1 },
    );
    expect(votes).toHaveLength(3);
    expect(new Set(votes.map((v) => v.categoryId))).toEqual(
      new Set(["a", "b", "c"]),
    );
    for (const vote of votes) {
      expect(["g1", "g2", "g3"]).toContain(vote.gameId);
    }
  });

  it("prefers top ranks across many draws", () => {
    const counts = new Map<string, number>();
    for (let i = 0; i < 400; i += 1) {
      const [vote] = buildSeedCategoryVotes(
        [{ id: "best" }],
        [{ id: "top" }, { id: "mid" }, { id: "low" }],
        { participationRate: 1 },
      );
      if (!vote) continue;
      counts.set(vote.gameId, (counts.get(vote.gameId) ?? 0) + 1);
    }
    expect(counts.get("top") ?? 0).toBeGreaterThan(counts.get("mid") ?? 0);
    expect(counts.get("mid") ?? 0).toBeGreaterThan(counts.get("low") ?? 0);
  });

  it("returns nothing without picks or categories", () => {
    expect(buildSeedCategoryVotes([{ id: "a" }], [])).toEqual([]);
    expect(buildSeedCategoryVotes([], [{ id: "g1" }])).toEqual([]);
  });
});
