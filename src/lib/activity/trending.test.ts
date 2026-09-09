import { describe, expect, it } from "vitest";
import {
  isPublicTrendingReady,
  kindWeightForTrending,
  countingKindsFromWeights,
  parsePublicTrendingMinPeople,
  parseTrendingKindWeights,
  parseTrendingRecencyWeight,
  parseTrendingRecencyWeights,
  parseTrendingWindowHours,
  recencyWeightForAgeMs,
  scoreTrending,
  DEFAULT_PUBLIC_TRENDING_MIN_PEOPLE,
  DEFAULT_TRENDING_KIND_WEIGHTS,
  DEFAULT_TRENDING_RECENCY_WEIGHTS,
  DEFAULT_TRENDING_WINDOW_HOURS,
  TRENDING_PLAYING_KIND_WEIGHT,
} from "./trending";
import { TRENDING_KINDS } from "./kinds";

const hour = 60 * 60 * 1000;
const now = new Date("2026-09-07T18:00:00.000Z");

describe("scoreTrending", () => {
  it("counts distinct people per game", () => {
    expect(
      scoreTrending([
        { profileId: "a", gameId: "g1", kind: "library_backlog" },
        { profileId: "a", gameId: "g1", kind: "list_add" },
        { profileId: "b", gameId: "g1", kind: "library_beat" },
        { profileId: "c", gameId: "g2", kind: "library_playing" },
      ]),
    ).toEqual([
      { gameId: "g1", people: 2, score: 2 },
      { gameId: "g2", people: 1, score: TRENDING_PLAYING_KIND_WEIGHT },
    ]);
  });

  it("excludes dropped, adult, and missing games", () => {
    expect(
      scoreTrending([
        { profileId: "a", gameId: "g1", kind: "library_dropped" },
        { profileId: "b", gameId: "g1", kind: "library_backlog", isAdult: true },
        { profileId: "c", gameId: null, kind: "library_backlog" },
        { profileId: "d", gameId: "g1", kind: "list_reveal" },
      ]),
    ).toEqual([]);
  });

  it("sorts by recency weight and still reports a real people count", () => {
    expect(
      scoreTrending(
        [
          {
            profileId: "a",
            gameId: "hot",
            kind: "library_playing",
            createdAt: new Date(now.getTime() - 2 * hour),
          },
          {
            profileId: "b",
            gameId: "hot",
            kind: "library_backlog",
            createdAt: new Date(now.getTime() - 8 * hour),
          },
          {
            profileId: "c",
            gameId: "old",
            kind: "library_backlog",
            createdAt: new Date(now.getTime() - 5 * 24 * hour),
          },
          {
            profileId: "d",
            gameId: "old",
            kind: "library_backlog",
            createdAt: new Date(now.getTime() - 6 * 24 * hour),
          },
          {
            profileId: "e",
            gameId: "old",
            kind: "library_beat",
            createdAt: new Date(now.getTime() - 4 * 24 * hour),
          },
          {
            profileId: "f",
            gameId: "old",
            kind: "list_add",
            createdAt: new Date(now.getTime() - 5.5 * 24 * hour),
          },
        ],
        { now },
      ),
    ).toEqual([
      { gameId: "hot", people: 2, score: 1 + TRENDING_PLAYING_KIND_WEIGHT },
      { gameId: "old", people: 4, score: 1 },
    ]);
  });

  it("ranks Playing above the same recency from other counting kinds", () => {
    expect(
      scoreTrending(
        [
          {
            profileId: "a",
            gameId: "playing",
            kind: "library_playing",
            createdAt: new Date(now.getTime() - 2 * hour),
          },
          {
            profileId: "b",
            gameId: "backlog",
            kind: "library_backlog",
            createdAt: new Date(now.getTime() - 2 * hour),
          },
        ],
        { now },
      ).map((row) => row.gameId),
    ).toEqual(["playing", "backlog"]);
  });

  it("lets recency beat an older Playing event", () => {
    expect(
      scoreTrending(
        [
          {
            profileId: "a",
            gameId: "fresh",
            kind: "library_wishlist",
            createdAt: new Date(now.getTime() - 2 * hour),
          },
          {
            profileId: "b",
            gameId: "playing",
            kind: "library_playing",
            createdAt: new Date(now.getTime() - 5 * 24 * hour),
          },
        ],
        { now },
      ).map((row) => row.gameId),
    ).toEqual(["fresh", "playing"]);
  });

  it("prefers Playing when two counting events share a timestamp", () => {
    expect(
      scoreTrending(
        [
          {
            profileId: "a",
            gameId: "g1",
            kind: "list_add",
            createdAt: now,
          },
          {
            profileId: "a",
            gameId: "g1",
            kind: "library_playing",
            createdAt: now,
          },
        ],
        { now },
      ),
    ).toEqual([
      { gameId: "g1", people: 1, score: TRENDING_PLAYING_KIND_WEIGHT },
    ]);
  });

  it("uses each person's most recent counting event on a game", () => {
    expect(
      scoreTrending(
        [
          {
            profileId: "a",
            gameId: "g1",
            kind: "library_backlog",
            createdAt: new Date(now.getTime() - 5 * 24 * hour),
          },
          {
            profileId: "a",
            gameId: "g1",
            kind: "library_playing",
            createdAt: new Date(now.getTime() - 3 * hour),
          },
        ],
        { now },
      ),
    ).toEqual([
      { gameId: "g1", people: 1, score: TRENDING_PLAYING_KIND_WEIGHT },
    ]);
  });
});

describe("kindWeightForTrending", () => {
  it("boosts Playing, leaves other counting kinds at 1, and zeros the rest", () => {
    expect(kindWeightForTrending("library_playing")).toBe(
      TRENDING_PLAYING_KIND_WEIGHT,
    );
    expect(kindWeightForTrending("library_wishlist")).toBe(1);
    expect(kindWeightForTrending("library_backlog")).toBe(1);
    expect(kindWeightForTrending("library_beat")).toBe(1);
    expect(kindWeightForTrending("list_add")).toBe(1);
    expect(kindWeightForTrending("library_paused")).toBe(0);
    expect(kindWeightForTrending("library_dropped")).toBe(0);
    expect(kindWeightForTrending("unknown")).toBe(0);
    expect(countingKindsFromWeights()).toEqual([...TRENDING_KINDS]);
  });

  it("lets a custom weight count dropped and omit wishlist", () => {
    const kindWeights = parseTrendingKindWeights({
      library_dropped: 0.5,
      library_wishlist: 0,
    });
    expect(
      scoreTrending(
        [
          {
            profileId: "a",
            gameId: "g1",
            kind: "library_dropped",
          },
          {
            profileId: "b",
            gameId: "g2",
            kind: "library_wishlist",
          },
        ],
        { kindWeights },
      ),
    ).toEqual([{ gameId: "g1", people: 1, score: 0.5 }]);
  });
});

describe("recencyWeightForAgeMs", () => {
  it("uses the four default buckets", () => {
    expect(recencyWeightForAgeMs(0)).toBe(1);
    expect(recencyWeightForAgeMs(24 * hour)).toBe(1);
    expect(recencyWeightForAgeMs(24 * hour + 1)).toBe(0.5);
    expect(recencyWeightForAgeMs(72 * hour)).toBe(0.5);
    expect(recencyWeightForAgeMs(72 * hour + 1)).toBe(0.25);
    expect(recencyWeightForAgeMs(7 * 24 * hour)).toBe(0.25);
    expect(recencyWeightForAgeMs(7 * 24 * hour + 1)).toBe(0.125);
  });
});

describe("parseTrendingRecencyWeights", () => {
  it("clamps and fills defaults", () => {
    expect(parseTrendingRecencyWeight(undefined, 1)).toBe(1);
    expect(parseTrendingRecencyWeight(-1, 1)).toBe(0);
    expect(parseTrendingRecencyWeight(99, 1)).toBe(10);
    expect(parseTrendingRecencyWeight(0.1254, 1)).toBe(0.125);
    expect(parseTrendingRecencyWeights({ hours24: 2 })).toEqual({
      ...DEFAULT_TRENDING_RECENCY_WEIGHTS,
      hours24: 2,
    });
    expect(parseTrendingKindWeights({ library_playing: 2 })).toEqual({
      ...DEFAULT_TRENDING_KIND_WEIGHTS,
      library_playing: 2,
    });
  });
});

describe("public trending floor", () => {
  it("defaults to five distinct people and a 7-day window", () => {
    expect(DEFAULT_PUBLIC_TRENDING_MIN_PEOPLE).toBe(5);
    expect(parsePublicTrendingMinPeople(undefined)).toBe(5);
    expect(parseTrendingWindowHours(undefined)).toBe(
      DEFAULT_TRENDING_WINDOW_HOURS,
    );
    expect(isPublicTrendingReady(4, 5)).toBe(false);
    expect(isPublicTrendingReady(5, 5)).toBe(true);
  });
});
