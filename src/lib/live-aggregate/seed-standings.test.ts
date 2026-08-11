import { describe, expect, it } from "vitest";
import {
  weightForRatedGame,
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
