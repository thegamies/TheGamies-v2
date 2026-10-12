import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const browseGames = vi.fn();
const readCatalogGameCount = vi.fn();

vi.mock("@thegamies/db", () => ({
  createDb: vi.fn(() => ({})),
  readCatalogGameCount: (...args: unknown[]) => readCatalogGameCount(...args),
}));

vi.mock("@/lib/catalog", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/catalog")>();
  return {
    ...actual,
    browseGames: (...args: unknown[]) => browseGames(...args),
  };
});

import {
  GAME_SEARCH_CACHE_LIMIT,
  GAME_SEARCH_CACHE_MAX_AGE_SECONDS,
  browseSearchCacheKeyInput,
  cachedBrowseGames,
  gameSearchCacheRequest,
  matchGameSearchHits,
  putGameSearchHits,
  shouldCacheGameSearchQuery,
} from "./game-search-cache";
import { GAMES_BROWSE_PAGE_SIZE } from "@/lib/catalog";

describe("shouldCacheGameSearchQuery", () => {
  it("skips blank and one-character queries", () => {
    expect(shouldCacheGameSearchQuery("")).toBe(false);
    expect(shouldCacheGameSearchQuery(" ")).toBe(false);
    expect(shouldCacheGameSearchQuery("h")).toBe(false);
    expect(shouldCacheGameSearchQuery(" ha")).toBe(true);
  });
});

describe("gameSearchCacheRequest", () => {
  const base = browseSearchCacheKeyInput(
    { q: "Hades", limit: GAME_SEARCH_CACHE_LIMIT },
    374_123,
  );

  it("lowercases q so ILIKE hits share a key", () => {
    const a = gameSearchCacheRequest(base).url;
    const b = gameSearchCacheRequest(
      browseSearchCacheKeyInput(
        { q: "  HADES ", limit: GAME_SEARCH_CACHE_LIMIT },
        374_123,
      ),
    ).url;
    expect(a).toBe(b);
    expect(a).toContain("q=hades");
  });

  it("includes catalog count, browse filters, limit, and offset", () => {
    const url = gameSearchCacheRequest(
      browseSearchCacheKeyInput(
        {
          q: "Hades",
          year: 2026,
          sort: "title",
          sortDir: "asc",
          releaseStatus: "released",
          excludeEditions: true,
          gotyEligibleTypes: true,
          includeDlcAddonType: true,
          limit: GAME_SEARCH_CACHE_LIMIT,
          offset: 0,
        },
        374_123,
      ),
    ).url;
    expect(url).toContain("count=374123");
    expect(url).toContain("year=2026");
    expect(url).toContain("sort=title");
    expect(url).toContain("dir=asc");
    expect(url).toContain("rs=released");
    expect(url).toContain("goty=1");
    expect(url).toContain("ed=1");
    expect(url).toContain("dlc=1");
    expect(url).toContain(`limit=${GAME_SEARCH_CACHE_LIMIT}`);
    expect(url).toContain("offset=0");
  });

  it("separates hub page size from typeahead", () => {
    const api = gameSearchCacheRequest(
      browseSearchCacheKeyInput(
        { q: "hades", limit: GAME_SEARCH_CACHE_LIMIT },
        10,
      ),
    ).url;
    const hub = gameSearchCacheRequest(
      browseSearchCacheKeyInput(
        { q: "hades", limit: GAMES_BROWSE_PAGE_SIZE + 1, offset: 0 },
        10,
      ),
    ).url;
    expect(api).not.toBe(hub);
  });

  it("omits count when the snapshot is missing", () => {
    const url = gameSearchCacheRequest(
      browseSearchCacheKeyInput({ q: "zelda", limit: 24 }, null),
    ).url;
    expect(url).not.toContain("count=");
  });

  it("misses when catalog count changes", () => {
    const a = gameSearchCacheRequest(base).url;
    const b = gameSearchCacheRequest({
      ...base,
      catalogGameCount: (base.catalogGameCount ?? 0) + 1,
    }).url;
    expect(a).not.toBe(b);
  });
});

describe("game search workers cache round-trip", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("misses when caches.default is absent", async () => {
    vi.stubGlobal("caches", undefined);
    await expect(
      matchGameSearchHits(
        browseSearchCacheKeyInput({ q: "hades", limit: 24 }, 1),
      ),
    ).resolves.toBeNull();
  });

  it("puts and matches hits through a fake Cache", async () => {
    const store = new Map<string, Response>();
    vi.stubGlobal("caches", {
      default: {
        match: async (request: Request) => store.get(request.url) ?? undefined,
        put: async (request: Request, response: Response) => {
          store.set(request.url, response);
        },
      },
    });

    const key = browseSearchCacheKeyInput({ q: "Hades", limit: 24 }, 10);
    const hits = [
      {
        id: "g1",
        igdbId: 1,
        slug: "hades",
        title: "Hades",
        year: 2020,
        coverUrl: null,
      },
    ];
    await putGameSearchHits(key, hits);
    await expect(
      matchGameSearchHits(
        browseSearchCacheKeyInput({ q: "hades", limit: 24 }, 10),
      ),
    ).resolves.toEqual(hits);
    expect(GAME_SEARCH_CACHE_MAX_AGE_SECONDS).toBe(300);
  });
});

describe("cachedBrowseGames", () => {
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
    browseGames.mockResolvedValue([row]);
    readCatalogGameCount.mockResolvedValue(100);
  });

  it("skips Workers Cache for q shorter than 2", async () => {
    vi.stubGlobal("caches", undefined);
    await expect(cachedBrowseGames({ q: "h" })).resolves.toEqual([row]);
    expect(readCatalogGameCount).not.toHaveBeenCalled();
    expect(browseGames).toHaveBeenCalled();
  });

  it("returns a cache hit without browsing", async () => {
    const cached = [{ ...row, id: "cached" }];
    const store = new Map<string, Response>();
    const keyUrl = gameSearchCacheRequest(
      browseSearchCacheKeyInput({ q: "Hades", limit: 24 }, 100),
    ).url;
    store.set(
      keyUrl,
      new Response(JSON.stringify(cached), {
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("caches", {
      default: {
        match: async (request: Request) => store.get(request.url) ?? undefined,
        put: async () => undefined,
      },
    });

    await expect(
      cachedBrowseGames({ q: "Hades", limit: 24 }),
    ).resolves.toEqual(cached);
    expect(browseGames).not.toHaveBeenCalled();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });
});
