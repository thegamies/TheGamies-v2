import { describe, expect, it } from "vitest";
import {
  applySeedWeightPower,
  igdbPickWeight,
  normalizeSeedSampling,
  sampleSeedList,
  weightedSampleExp,
} from "./seed-sampling";

describe("igdbPickWeight", () => {
  it("raises weight with more critic votes and higher rating", () => {
    const popular = igdbPickWeight(90, 10_000);
    const obscure = igdbPickWeight(90, 2);
    const middling = igdbPickWeight(50, 10_000);
    expect(popular).toBeGreaterThan(obscure);
    expect(popular).toBeGreaterThan(middling);
  });

  it("defaults missing rating to 75 and missing count to 0", () => {
    expect(igdbPickWeight(null, null)).toBe(0);
    expect(igdbPickWeight(undefined, 0)).toBe(0);
    expect(igdbPickWeight(75, 10)).toBeCloseTo(Math.log(11) * 0.75);
  });
});

describe("applySeedWeightPower", () => {
  it("widens the gap between high and low weights as power increases", () => {
    const high = igdbPickWeight(90, 10_000);
    const low = igdbPickWeight(50, 10);
    const ratio1 =
      applySeedWeightPower(high, 1) / applySeedWeightPower(low, 1);
    const ratio3 =
      applySeedWeightPower(high, 3) / applySeedWeightPower(low, 3);
    expect(ratio3).toBeGreaterThan(ratio1);
  });
});

describe("normalizeSeedSampling", () => {
  it("applies old load-test defaults", () => {
    const parsed = normalizeSeedSampling({
      minGamesPerList: 1,
      maxGamesPerList: 10,
      minRank: 1,
      maxRank: 10,
    });
    expect(parsed).toMatchObject({
      minGamesPerList: 1,
      maxGamesPerList: 10,
      minRank: 1,
      maxRank: 10,
      distribution: "weighted",
      topN: null,
      weightPower: 1,
    });
  });

  it("treats topN 0 as no limit", () => {
    const parsed = normalizeSeedSampling({ topN: 0, maxRank: 10, maxGamesPerList: 10 });
    expect(parsed).toMatchObject({ topN: null });
  });

  it("rejects games per list outside the rank span", () => {
    const parsed = normalizeSeedSampling({
      minRank: 1,
      maxRank: 10,
      minGamesPerList: 1,
      maxGamesPerList: 11,
    });
    expect(parsed).toMatchObject({ error: expect.stringContaining("rank span") });
  });

  it("rejects weight power outside 0.1–5", () => {
    expect(normalizeSeedSampling({ weightPower: 0 })).toMatchObject({
      error: expect.stringContaining("Weight power"),
    });
    expect(normalizeSeedSampling({ weightPower: 5.1 })).toMatchObject({
      error: expect.stringContaining("Weight power"),
    });
  });
});

describe("weightedSampleExp", () => {
  it("returns unique picks of requested size", () => {
    const items = Array.from({ length: 20 }, (_, i) => i);
    const picks = weightedSampleExp(items, 5, () => 1);
    expect(picks).toHaveLength(5);
    expect(new Set(picks).size).toBe(5);
  });

  it("prefers higher IGDB weight across many draws", () => {
    const items = [
      { id: "hot", rating: 90, ratingCount: 10_000 },
      { id: "cold", rating: 50, ratingCount: 1 },
    ];
    const counts = { hot: 0, cold: 0 };
    for (let i = 0; i < 400; i += 1) {
      const [pick] = weightedSampleExp(items, 1, (game) =>
        applySeedWeightPower(
          igdbPickWeight(game.rating, game.ratingCount),
          1,
        ),
      );
      if (pick?.id === "hot" || pick?.id === "cold") {
        counts[pick.id] += 1;
      }
    }
    expect(counts.hot).toBeGreaterThan(counts.cold);
  });
});

describe("sampleSeedList", () => {
  const pool = Array.from({ length: 20 }, (_, i) => ({ id: i }));
  const sampling = {
    minGamesPerList: 3,
    maxGamesPerList: 3,
    minRank: 5,
    maxRank: 10,
    distribution: "uniform" as const,
    topN: 50,
    weightPower: 1,
  };

  it("uses a fixed length and ranks from minRank", () => {
    const { picks, ranks } = sampleSeedList(pool, sampling, () => 1);
    expect(picks).toHaveLength(3);
    expect(ranks).toEqual([5, 6, 7]);
  });

  it("stays within min–max length", () => {
    const ranged = {
      ...sampling,
      minGamesPerList: 2,
      maxGamesPerList: 5,
      minRank: 1,
      maxRank: 10,
    };
    for (let i = 0; i < 40; i += 1) {
      const { picks, ranks } = sampleSeedList(pool, ranged, () => 1);
      expect(picks.length).toBeGreaterThanOrEqual(2);
      expect(picks.length).toBeLessThanOrEqual(5);
      expect(ranks[0]).toBe(1);
      expect(ranks.at(-1)).toBe(picks.length);
    }
  });
});
