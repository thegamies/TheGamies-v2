import { beforeEach, describe, expect, it, vi } from "vitest";

const readCatalogGameCount = vi.fn();
const browseGames = vi.fn();
const matchGameSearchHits = vi.fn();
const putGameSearchHits = vi.fn();

vi.mock("@thegamies/db", () => ({
  createDb: vi.fn(() => ({})),
  readCatalogGameCount: (...args: unknown[]) => readCatalogGameCount(...args),
}));

vi.mock("@/lib/catalog", () => ({
  browseGames: (...args: unknown[]) => browseGames(...args),
}));

vi.mock("@/lib/catalog/game-search-cache", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/lib/catalog/game-search-cache")
  >();
  return {
    ...actual,
    matchGameSearchHits: (...args: unknown[]) => matchGameSearchHits(...args),
    putGameSearchHits: (...args: unknown[]) => putGameSearchHits(...args),
  };
});

import { searchGamesForList } from "./search-games";

const row = {
  id: "g1",
  igdbId: 1,
  slug: "hades",
  title: "Hades",
  year: 2020,
  coverUrl: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  browseGames.mockResolvedValue([row]);
  readCatalogGameCount.mockResolvedValue(100);
  matchGameSearchHits.mockResolvedValue(null);
  putGameSearchHits.mockResolvedValue(undefined);
});

describe("searchGamesForList cache wrap", () => {
  it("skips Workers Cache for q shorter than 2", async () => {
    await expect(searchGamesForList({ q: "h" })).resolves.toEqual([
      {
        id: "g1",
        igdbId: 1,
        slug: "hades",
        title: "Hades",
        year: 2020,
        coverUrl: null,
      },
    ]);
    expect(readCatalogGameCount).not.toHaveBeenCalled();
    expect(matchGameSearchHits).not.toHaveBeenCalled();
    expect(putGameSearchHits).not.toHaveBeenCalled();
    expect(browseGames).toHaveBeenCalled();
  });

  it("returns a cache hit without browsing", async () => {
    const cached = [
      {
        id: "cached",
        igdbId: 2,
        slug: "hades-ii",
        title: "Hades II",
        year: 2025,
        coverUrl: null,
      },
    ];
    matchGameSearchHits.mockResolvedValue(cached);

    await expect(searchGamesForList({ q: "Hades" })).resolves.toEqual(cached);
    expect(browseGames).not.toHaveBeenCalled();
    expect(putGameSearchHits).not.toHaveBeenCalled();
    expect(matchGameSearchHits).toHaveBeenCalledWith(
      expect.objectContaining({
        q: "Hades",
        catalogGameCount: 100,
      }),
    );
  });

  it("puts after a miss", async () => {
    await searchGamesForList({ q: "hades", year: 2020 });
    expect(browseGames).toHaveBeenCalled();
    expect(putGameSearchHits).toHaveBeenCalledWith(
      expect.objectContaining({
        q: "hades",
        year: 2020,
        catalogGameCount: 100,
      }),
      [
        {
          id: "g1",
          igdbId: 1,
          slug: "hades",
          title: "Hades",
          year: 2020,
          coverUrl: null,
        },
      ],
    );
  });
});
