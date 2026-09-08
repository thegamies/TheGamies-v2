import { describe, expect, it } from "vitest";
import {
  SEED_LIBRARY_GAMES_PER_PROFILE,
  seedLibraryEventTime,
  seedLibraryGameIdsForIndex,
  seedLibraryStatusForIndex,
} from "./seed";

describe("seedLibraryGameIdsForIndex", () => {
  it("rotates through the pool so neighboring seeds share titles", () => {
    const pool = ["a", "b", "c", "d", "e", "f", "g", "h"];
    expect(seedLibraryGameIdsForIndex(pool, 0, 4)).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
    expect(seedLibraryGameIdsForIndex(pool, 1, 4)).toEqual([
      "c",
      "d",
      "e",
      "f",
    ]);
  });

  it("returns nothing when the catalog pool is empty", () => {
    expect(seedLibraryGameIdsForIndex([], 0)).toEqual([]);
    expect(SEED_LIBRARY_GAMES_PER_PROFILE).toBe(10);
  });
});

describe("seedLibraryStatusForIndex", () => {
  it("cycles Playing / Beat / Backlog / Wishlist and skips Paused and Dropped", () => {
    expect(seedLibraryStatusForIndex(0, 0)).toBe("playing");
    expect(seedLibraryStatusForIndex(0, 1)).toBe("beat");
    expect(seedLibraryStatusForIndex(0, 2)).toBe("backlog");
    expect(seedLibraryStatusForIndex(0, 3)).toBe("wishlist");
    expect(seedLibraryStatusForIndex(1, 0)).toBe("beat");
  });
});

describe("seedLibraryEventTime", () => {
  it("stays inside a five-day window so the default trending board can see it", () => {
    const now = new Date("2026-09-07T18:00:00.000Z");
    const created = seedLibraryEventTime(now, 3, 2);
    const deltaHours = (now.getTime() - created.getTime()) / 3_600_000;
    expect(deltaHours).toBeGreaterThanOrEqual(2);
    expect(deltaHours).toBeLessThanOrEqual(24 * 5 + 2);
  });
});
