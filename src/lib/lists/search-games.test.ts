import { beforeEach, describe, expect, it, vi } from "vitest";

const cachedBrowseGames = vi.fn();

vi.mock("@/lib/catalog/game-search-cache", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/lib/catalog/game-search-cache")
  >();
  return {
    ...actual,
    cachedBrowseGames: (...args: unknown[]) => cachedBrowseGames(...args),
  };
});

import { GAME_SEARCH_CACHE_LIMIT } from "@/lib/catalog/game-search-cache";
import { searchGamesForList } from "./search-games";

const row = {
  id: "g1",
  igdbId: 1,
  slug: "hades",
  title: "Hades",
  year: 2020,
  firstReleaseDate: null,
  popularity: 1,
  coverImageId: null,
  coverUrl: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  cachedBrowseGames.mockResolvedValue([row]);
});

describe("searchGamesForList", () => {
  it("loads typeahead hits through cachedBrowseGames", async () => {
    await expect(searchGamesForList({ q: "Hades" })).resolves.toEqual([
      {
        id: "g1",
        igdbId: 1,
        slug: "hades",
        title: "Hades",
        year: 2020,
        coverUrl: null,
      },
    ]);
    expect(cachedBrowseGames).toHaveBeenCalledWith(
      expect.objectContaining({
        q: "Hades",
        limit: GAME_SEARCH_CACHE_LIMIT,
        sort: "popularity",
      }),
    );
  });

  it("does not pass a one-character q into browse", async () => {
    await searchGamesForList({ q: "h" });
    expect(cachedBrowseGames).toHaveBeenCalledWith(
      expect.objectContaining({
        q: undefined,
        limit: GAME_SEARCH_CACHE_LIMIT,
      }),
    );
  });
});
