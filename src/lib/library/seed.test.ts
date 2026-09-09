import { describe, expect, it } from "vitest";
import {
  LIBRARY_SEED_RECENCY_FLOOR,
  SEED_LIBRARY_GAMES_PER_PROFILE,
  SEED_LIBRARY_PLAYING_PER_PROFILE,
  SEED_LIBRARY_PLAYING_POOL_SIZE,
  librarySeedPlayingHeat,
  librarySeedRecencyWeight,
  rankLibrarySeedPool,
  seedLibraryAssignmentsForIndex,
  seedLibraryEventTime,
  seedLibraryGameIdsForIndex,
} from "./seed";

const now = new Date("2026-09-07T18:00:00.000Z");
const day = 24 * 60 * 60 * 1000;

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

describe("librarySeedPlayingHeat", () => {
  it("zeros unreleased and missing dates", () => {
    expect(librarySeedRecencyWeight(null, now)).toBe(0);
    expect(
      librarySeedPlayingHeat(9_000, new Date("2026-12-31T00:00:00.000Z"), now),
    ).toBe(0);
  });

  it("lets a popular recent release beat an older hit and a brand-new nobody", () => {
    const recentHit = librarySeedPlayingHeat(
      3_000,
      new Date(now.getTime() - 20 * day),
      now,
    );
    const oldHit = librarySeedPlayingHeat(
      10_000,
      new Date("2026-01-15T00:00:00.000Z"),
      now,
    );
    const newNobody = librarySeedPlayingHeat(
      40,
      new Date(now.getTime() - day),
      now,
    );
    expect(recentHit).toBeGreaterThan(oldHit);
    expect(oldHit).toBeGreaterThan(newNobody);
    expect(librarySeedRecencyWeight(now, now)).toBe(1);
    expect(
      librarySeedRecencyWeight(new Date("2020-01-01T00:00:00.000Z"), now),
    ).toBeCloseTo(LIBRARY_SEED_RECENCY_FLOOR, 2);
  });
});

describe("rankLibrarySeedPool", () => {
  it("orders by popularity × recency and drops TBA", () => {
    expect(
      rankLibrarySeedPool(
        [
          {
            id: "tba",
            popularity: 50_000,
            firstReleaseDate: new Date("2026-12-31T00:00:00.000Z"),
          },
          {
            id: "fresh-hit",
            popularity: 3_000,
            firstReleaseDate: new Date(now.getTime() - 20 * day),
          },
          {
            id: "old-hit",
            popularity: 10_000,
            firstReleaseDate: new Date("2026-01-15T00:00:00.000Z"),
          },
          {
            id: "nobody",
            popularity: 40,
            firstReleaseDate: new Date(now.getTime() - day),
          },
        ],
        now,
      ),
    ).toEqual(["fresh-hit", "old-hit", "nobody"]);
  });
});

describe("seedLibraryAssignmentsForIndex", () => {
  it("takes Playing from the hottest titles, not the long tail", () => {
    const pool = [
      "hot-a",
      "hot-b",
      "hot-c",
      "hot-d",
      "hot-e",
      "hot-f",
      "hot-g",
      "hot-h",
      "hot-i",
      "hot-j",
      "hot-k",
      "hot-l",
      "tail-1",
      "tail-2",
      "tail-3",
      "tail-4",
      "tail-5",
      "tail-6",
      "tail-7",
      "tail-8",
    ];
    expect(SEED_LIBRARY_PLAYING_POOL_SIZE).toBe(12);
    expect(SEED_LIBRARY_PLAYING_PER_PROFILE).toBe(3);
    const first = seedLibraryAssignmentsForIndex(pool, 0);
    const later = seedLibraryAssignmentsForIndex(pool, 20);
    const playing = first
      .filter((row) => row.status === "playing")
      .map((row) => row.gameId);
    expect(playing).toEqual(["hot-a", "hot-b", "hot-c"]);
    expect(playing.every((id) => id.startsWith("hot-"))).toBe(true);
    expect(
      later
        .filter((row) => row.status === "playing")
        .every((row) => row.gameId.startsWith("hot-")),
    ).toBe(true);
    expect(first.map((row) => row.status)).not.toContain("paused");
    expect(first.map((row) => row.status)).not.toContain("dropped");
  });
});

describe("seedLibraryEventTime", () => {
  it("stamps Playing inside the last day so recency weight is strongest", () => {
    const created = seedLibraryEventTime(now, 3, 2, "playing");
    const deltaHours = (now.getTime() - created.getTime()) / 3_600_000;
    expect(deltaHours).toBeGreaterThanOrEqual(1);
    expect(deltaHours).toBeLessThan(24);
  });

  it("stamps other statuses later in the five-day trending window", () => {
    const created = seedLibraryEventTime(now, 3, 2, "backlog");
    const deltaHours = (now.getTime() - created.getTime()) / 3_600_000;
    expect(deltaHours).toBeGreaterThanOrEqual(24);
    expect(deltaHours).toBeLessThan(24 * 5);
  });
});
