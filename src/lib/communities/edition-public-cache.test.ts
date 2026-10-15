import { afterEach, describe, expect, it, vi } from "vitest";
import {
  EDITION_PUBLIC_CACHE_MAX_AGE_SECONDS,
  editionBoardCacheKey,
  matchEditionBoard,
  putEditionBoard,
} from "./edition-public-cache";

function fakeCache() {
  const store = new Map<string, Response>();
  vi.stubGlobal("caches", {
    default: {
      match: async (request: Request) => store.get(request.url)?.clone(),
      put: async (request: Request, response: Response) => {
        store.set(request.url, response.clone());
      },
    },
  });
  return store;
}

const board = {
  meta: {
    frozenAt: new Date("2026-01-02T00:00:00.000Z"),
    ballotCountCommunity: 1010,
    ballotCountVoices: 3,
    gotyTotalCommunity: 40,
    gotyTotalVoices: 8,
    customAwardsSettled: true,
  },
  topTen: [],
};

describe("edition public board cache", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keys a view, mode, category, and page separately", () => {
    const standings = editionBoardCacheKey({
      editionId: "ed",
      view: "standings",
      mode: "community",
      rankMode: "dense",
    });
    const hosts = editionBoardCacheKey({
      editionId: "ed",
      view: "standings",
      mode: "voices",
      rankMode: "dense",
    });
    const category = editionBoardCacheKey({
      editionId: "ed",
      view: "category",
      mode: "community",
      rankMode: "dense",
      categoryId: "best-gameplay",
      page: 2,
    });
    expect(standings).not.toBe(hosts);
    expect(category).toContain("best-gameplay");
    expect(category).toContain("/2/");
  });

  it("revives the freeze time and skips a second read of the same key", async () => {
    const store = fakeCache();
    const key = editionBoardCacheKey({
      editionId: "ed",
      view: "results",
      mode: "community",
      rankMode: "dense",
    });
    expect(await matchEditionBoard(key)).toBeNull();
    await putEditionBoard(key, board);
    const hit = await matchEditionBoard<typeof board>(key);
    expect(hit?.meta.frozenAt).toBeInstanceOf(Date);
    expect(hit?.meta.frozenAt.toISOString()).toBe("2026-01-02T00:00:00.000Z");
    expect(hit?.meta.ballotCountCommunity).toBe(1010);
    expect(hit?.meta.customAwardsSettled).toBe(true);

    const stored = await [...store.values()][0]?.json();
    expect(stored.meta.frozenAt).toBe("2026-01-02T00:00:00.000Z");
  });

  it("stores a miss for 60 seconds", async () => {
    const store = fakeCache();
    const key = editionBoardCacheKey({
      editionId: "ed",
      view: "voters",
      mode: "community",
      rankMode: "competition",
      q: "Ada",
    });
    await putEditionBoard(key, board);
    const response = [...store.values()][0];
    expect(response?.headers.get("cache-control")).toBe(
      `public, max-age=${EDITION_PUBLIC_CACHE_MAX_AGE_SECONDS}`,
    );
  });
});