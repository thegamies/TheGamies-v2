import { describe, expect, it } from "vitest";
import type { EditionCategoryStandingBlock } from "@/lib/communities/edition-results";
import {
  applyEditionCategoryRevealDebug,
  limitEditionCategoryRanksForDebug,
  parseRevealTieRepeat,
  repeatEditionCategoryRanksForDebug,
  REVEAL_TIE_REPEAT_MAX,
} from "./edition-reveal-tie-debug";

const sample: EditionCategoryStandingBlock[] = [
  {
    categoryId: "cat-1",
    label: "Best Soundtrack",
    description: null,
    rows: [
      {
        place: 1,
        rank: 1,
        gameId: "g1",
        slug: "alpha",
        title: "Alpha",
        coverUrl: null,
        votes: 10,
      },
      {
        place: 2,
        rank: 2,
        gameId: "g2",
        slug: "beta",
        title: "Beta",
        coverUrl: null,
        votes: 4,
      },
      {
        place: 3,
        rank: 2,
        gameId: "g3",
        slug: "gamma",
        title: "Gamma",
        coverUrl: null,
        votes: 4,
      },
    ],
  },
];

describe("parseRevealTieRepeat", () => {
  it("is inert outside development", () => {
    expect(parseRevealTieRepeat("12", { nodeEnv: "production" })).toBe(1);
    expect(parseRevealTieRepeat("12", { nodeEnv: "test" })).toBe(1);
  });

  it("parses and caps in development", () => {
    expect(parseRevealTieRepeat("1", { nodeEnv: "development" })).toBe(1);
    expect(parseRevealTieRepeat("8", { nodeEnv: "development" })).toBe(8);
    expect(
      parseRevealTieRepeat("999", { nodeEnv: "development" }),
    ).toBe(REVEAL_TIE_REPEAT_MAX);
    expect(parseRevealTieRepeat("nope", { nodeEnv: "development" })).toBe(1);
  });
});

describe("limitEditionCategoryRanksForDebug", () => {
  it("leaves data alone when cap is off", () => {
    expect(limitEditionCategoryRanksForDebug(sample, 0)).toBe(sample);
  });

  it("truncates each derived-rank group independently", () => {
    const out = limitEditionCategoryRanksForDebug(sample, 1);
    expect(out[0]!.rows.map((r) => r.slug)).toEqual(["alpha", "beta"]);
  });
});

describe("repeatEditionCategoryRanksForDebug", () => {
  it("leaves data alone when times is 1", () => {
    expect(repeatEditionCategoryRanksForDebug(sample, 1)).toBe(sample);
  });

  it("multiplies each rank group independently", () => {
    const out = repeatEditionCategoryRanksForDebug(sample, 3);
    const ranks = out[0]!.rows.reduce(
      (acc, row) => {
        acc[row.rank] = (acc[row.rank] ?? 0) + 1;
        return acc;
      },
      {} as Record<number, number>,
    );
    expect(ranks[1]).toBe(3);
    expect(ranks[2]).toBe(6);
    expect(out[0]!.rows.some((r) => r.slug.includes("--tie2"))).toBe(true);
  });
});

describe("applyEditionCategoryRevealDebug", () => {
  it("caps per rank before repeating", () => {
    const out = applyEditionCategoryRevealDebug(sample, {
      maxPerRank: 1,
      repeat: 3,
    });
    // rank 1: 1 → 3; rank 2: 2 → keep 1 → 3
    expect(out[0]!.rows).toHaveLength(6);
    expect(out[0]!.rows.every((r) => !r.slug.includes("gamma"))).toBe(true);
  });
});
