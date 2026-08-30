import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/catalog", () => ({
  browseGames: vi.fn(),
}));

import { browseGames } from "@/lib/catalog";
import {
  HOME_BIG_PICTURE_PER_YEAR,
  listHomeBigPictureGames,
} from "./big-picture-games";

describe("listHomeBigPictureGames", () => {
  it("loads current and previous year by popularity and skips coverless rows", async () => {
    const browse = vi.mocked(browseGames);
    browse.mockImplementation(async (input = {}) => {
      if (input.year === 2026) {
        return [
          {
            id: "a",
            igdbId: 1,
            slug: "one",
            title: "One",
            year: 2026,
            firstReleaseDate: null,
            popularity: 100,
            coverImageId: "x",
            coverUrl: "https://cdn.example/one.jpg",
          },
          {
            id: "b",
            igdbId: 2,
            slug: "two",
            title: "Two",
            year: 2026,
            firstReleaseDate: null,
            popularity: 90,
            coverImageId: null,
            coverUrl: null,
          },
        ];
      }
      return [
        {
          id: "c",
          igdbId: 3,
          slug: "three",
          title: "Three",
          year: 2025,
          firstReleaseDate: null,
          popularity: 80,
          coverImageId: "y",
          coverUrl: "https://cdn.example/three.jpg",
        },
      ];
    });

    const games = await listHomeBigPictureGames(
      new Date("2026-08-21T12:00:00.000Z"),
    );

    expect(browse).toHaveBeenCalledTimes(2);
    expect(browse).toHaveBeenCalledWith(
      expect.objectContaining({
        year: 2026,
        sort: "popularity",
        sortDir: "desc",
        limit: HOME_BIG_PICTURE_PER_YEAR,
      }),
    );
    expect(browse).toHaveBeenCalledWith(
      expect.objectContaining({ year: 2025, sort: "popularity" }),
    );
    expect(games).toEqual([
      {
        gameId: "a",
        slug: "one",
        title: "One",
        coverUrl: "https://cdn.example/one.jpg",
      },
      {
        gameId: "c",
        slug: "three",
        title: "Three",
        coverUrl: "https://cdn.example/three.jpg",
      },
    ]);
  });
});
