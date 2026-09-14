import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/catalog", () => ({
  browseGames: vi.fn(),
}));

vi.mock("@/lib/activity/query", () => ({
  listTrendingBoard: vi.fn(),
}));

import { browseGames } from "@/lib/catalog";
import { listTrendingBoard } from "@/lib/activity/query";
import {
  HOME_DISCOVER_CAP,
  listHomeTrendingGames,
  listHomeUpcomingGames,
} from "./discover-games";

describe("listHomeUpcomingGames", () => {
  it("loads a capped upcoming popularity page and skips coverless rows", async () => {
    const browse = vi.mocked(browseGames);
    browse.mockResolvedValue([
      {
        id: "a",
        igdbId: 1,
        slug: "one",
        title: "One",
        year: 2027,
        firstReleaseDate: new Date("2027-03-01"),
        popularity: 100,
        coverImageId: "x",
        coverUrl: "https://cdn.example/one.jpg",
      },
      {
        id: "b",
        igdbId: 2,
        slug: "two",
        title: "Two",
        year: 2027,
        firstReleaseDate: new Date("2027-06-01"),
        popularity: 90,
        coverImageId: null,
        coverUrl: null,
      },
    ]);

    const games = await listHomeUpcomingGames();

    expect(browse).toHaveBeenCalledWith(
      expect.objectContaining({
        releaseStatus: "upcoming",
        sort: "popularity",
        sortDir: "desc",
        excludeEditions: true,
        gotyEligibleTypes: true,
        limit: HOME_DISCOVER_CAP,
        offset: 0,
      }),
    );
    expect(games).toEqual([
      {
        gameId: "a",
        slug: "one",
        title: "One",
        coverUrl: "https://cdn.example/one.jpg",
      },
    ]);
  });
});

describe("listHomeTrendingGames", () => {
  it("returns an empty strip when the public floor is not met", async () => {
    vi.mocked(listTrendingBoard).mockResolvedValue({
      rows: [
        {
          gameId: "a",
          slug: "one",
          title: "One",
          coverUrl: "https://cdn.example/one.jpg",
        },
      ],
      windowHours: 24 * 7,
      publicReady: false,
      distinctPeople: 1,
      total: 0,
      page: 1,
      totalPages: 1,
    });

    expect(await listHomeTrendingGames({ minPeople: 5 })).toEqual([]);
  });

  it("caps the public board to the homepage page size", async () => {
    vi.mocked(listTrendingBoard).mockResolvedValue({
      rows: Array.from({ length: 20 }, (_, i) => ({
        gameId: String(i),
        slug: `g-${i}`,
        title: `Game ${i}`,
        coverUrl: `https://cdn.example/${i}.jpg`,
      })),
      windowHours: 24 * 7,
      publicReady: true,
      distinctPeople: 12,
      total: 20,
      page: 1,
      totalPages: 1,
    });

    const games = await listHomeTrendingGames({ minPeople: 5 });
    expect(games).toHaveLength(HOME_DISCOVER_CAP);
    expect(games[0]).toEqual({
      gameId: "0",
      slug: "g-0",
      title: "Game 0",
      coverUrl: "https://cdn.example/0.jpg",
    });
  });
});
