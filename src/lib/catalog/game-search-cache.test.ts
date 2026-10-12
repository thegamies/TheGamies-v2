import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GAME_SEARCH_CACHE_LIMIT,
  GAME_SEARCH_CACHE_MAX_AGE_SECONDS,
  gameSearchCacheRequest,
  matchGameSearchHits,
  putGameSearchHits,
  shouldCacheGameSearchQuery,
} from "./game-search-cache";

describe("shouldCacheGameSearchQuery", () => {
  it("skips blank and one-character queries", () => {
    expect(shouldCacheGameSearchQuery("")).toBe(false);
    expect(shouldCacheGameSearchQuery(" ")).toBe(false);
    expect(shouldCacheGameSearchQuery("h")).toBe(false);
    expect(shouldCacheGameSearchQuery(" ha")).toBe(true);
  });
});

describe("gameSearchCacheRequest", () => {
  const base = {
    q: "Hades",
    catalogGameCount: 374_123,
  };

  it("lowercases q so ILIKE hits share a key", () => {
    const a = gameSearchCacheRequest(base).url;
    const b = gameSearchCacheRequest({ ...base, q: "  HADES " }).url;
    expect(a).toBe(b);
    expect(a).toContain("q=hades");
  });

  it("includes catalog count, filters, and limit", () => {
    const url = gameSearchCacheRequest({
      ...base,
      year: 2026,
      gotyMode: true,
      eligibility: "goty",
      allowEditions: true,
      allowDlcAddon: true,
    }).url;
    expect(url).toContain("count=374123");
    expect(url).toContain("year=2026");
    expect(url).toContain("goty=1");
    expect(url).toContain("el=goty");
    expect(url).toContain("ed=1");
    expect(url).toContain("dlc=1");
    expect(url).toContain(`limit=${GAME_SEARCH_CACHE_LIMIT}`);
  });

  it("omits count when the snapshot is missing", () => {
    const url = gameSearchCacheRequest({
      q: "zelda",
      catalogGameCount: null,
    }).url;
    expect(url).not.toContain("count=");
  });

  it("misses when catalog count changes", () => {
    const a = gameSearchCacheRequest(base).url;
    const b = gameSearchCacheRequest({
      ...base,
      catalogGameCount: base.catalogGameCount + 1,
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
      matchGameSearchHits({ q: "hades", catalogGameCount: 1 }),
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

    const key = { q: "Hades", catalogGameCount: 10 };
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
    await expect(matchGameSearchHits({ ...key, q: "hades" })).resolves.toEqual(
      hits,
    );
    expect(GAME_SEARCH_CACHE_MAX_AGE_SECONDS).toBe(300);
  });
});
