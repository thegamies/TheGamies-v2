import { afterEach, describe, expect, it, vi } from "vitest";
import {
  HOME_PUBLIC_CACHE_MAX_AGE_SECONDS,
  homePublicCacheRequest,
  type HomePublicCacheValue,
} from "./home-public-cache";
import { loadHomePublic, type HomePublicDeps } from "./load-home-public";

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

function deps(overrides: Partial<HomePublicDeps> = {}): HomePublicDeps {
  return {
    getSiteSettings: vi.fn(async () => ({
      standingFillMinVisible: 3,
      landingStandingsYears: [2025, 2026],
      publicTrendingMinPeople: 5,
    })),
    listHomeBigPictureGames: vi.fn(async () => [
      {
        gameId: "bp",
        slug: "bp",
        title: "BP",
        coverUrl: "https://cdn.example/bp.jpg",
      },
    ]),
    listHomeUpcomingGames: vi.fn(async () => []),
    listHomeTrendingGames: vi.fn(async () => []),
    filterYearsWithPublicGoty: vi.fn(async (years: number[]) => years),
    getGotyThroughRankForYears: vi.fn(async (years: number[]) =>
      years.map((year) => ({
        year,
        rows: [
          {
            place: 1,
            gameId: "g",
            slug: "g",
            title: "G",
            coverUrl: null,
            score: 10,
          },
        ],
      })),
    ),
    getCategoryHighlightsForYears: vi.fn(async () => []),
    readPromotedTgaSchedule: vi.fn(async () => ({
      year: 2025,
      enabled: true,
      opensAt: new Date("2025-11-01T00:00:00.000Z"),
      showStartsAt: new Date("2025-12-11T01:00:00.000Z"),
    })),
    ...overrides,
  };
}

describe("loadHomePublic", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("skips loaders on a cache hit and revives Pick’em dates", async () => {
    fakeCache();
    const first = deps();
    const loaded = await loadHomePublic(first);
    expect(loaded.tga?.opensAt).toEqual(new Date("2025-11-01T00:00:00.000Z"));
    expect(loaded.tga?.showStartsAt).toEqual(
      new Date("2025-12-11T01:00:00.000Z"),
    );

    const stored = await (
      await fakeCacheMatch()
    ).json() as HomePublicCacheValue;
    expect(stored.tga?.opensAt).toBe("2025-11-01T00:00:00.000Z");
    expect(stored.tga?.showStartsAt).toBe("2025-12-11T01:00:00.000Z");

    const second = deps();
    const again = await loadHomePublic(second);
    expect(second.getSiteSettings).not.toHaveBeenCalled();
    expect(second.listHomeBigPictureGames).not.toHaveBeenCalled();
    expect(second.readPromotedTgaSchedule).not.toHaveBeenCalled();
    expect(second.getGotyThroughRankForYears).not.toHaveBeenCalled();
    expect(again.standingsReady).toBe(true);
    expect(again.tga?.opensAt).toBeInstanceOf(Date);
    expect(again.tga?.opensAt?.toISOString()).toBe("2025-11-01T00:00:00.000Z");
    expect(again.sections[0]?.yearHref).toBe("/game-of-the-year/2026");
  });

  it("stores a miss for 60 seconds", async () => {
    const store = fakeCache();
    await loadHomePublic(deps());
    const response = store.get(homePublicCacheRequest().url);
    expect(response?.headers.get("cache-control")).toBe(
      `public, max-age=${HOME_PUBLIC_CACHE_MAX_AGE_SECONDS}`,
    );
    expect(HOME_PUBLIC_CACHE_MAX_AGE_SECONDS).toBe(60);
  });

  it("still loads when caches.default is absent", async () => {
    vi.stubGlobal("caches", undefined);
    const loaders = deps();
    const result = await loadHomePublic(loaders);
    expect(loaders.getSiteSettings).toHaveBeenCalledTimes(1);
    expect(result.bigPictureGames).toHaveLength(1);
    expect(result.standingsReady).toBe(true);
    expect(result.tga?.opensAt).toBeInstanceOf(Date);
  });

  it("does not cache a failed standings load and still returns covers", async () => {
    fakeCache();
    const loaders = deps({
      getGotyThroughRankForYears: vi.fn(async () => {
        throw new Error("standings");
      }),
    });
    const result = await loadHomePublic(loaders);
    expect(result.standingsReady).toBe(false);
    expect(result.sections).toEqual([]);
    expect(result.bigPictureGames).toHaveLength(1);
    expect(result.tga?.year).toBe(2025);

    vi.mocked(loaders.listHomeBigPictureGames).mockClear();
    await loadHomePublic(loaders);
    expect(loaders.listHomeBigPictureGames).toHaveBeenCalled();
  });

  it("starts settings, covers, and the promoted year together", async () => {
    vi.stubGlobal("caches", undefined);
    let releaseWave1: () => void = () => {};
    const wave1 = new Promise<void>((resolve) => {
      releaseWave1 = resolve;
    });
    let releaseWave2: () => void = () => {};
    const wave2 = new Promise<void>((resolve) => {
      releaseWave2 = resolve;
    });
    const calls: string[] = [];
    const loaders = deps({
      getSiteSettings: vi.fn(async () => {
        calls.push("settings");
        await wave1;
        return {
          standingFillMinVisible: 3,
          landingStandingsYears: [2026],
          publicTrendingMinPeople: 5,
        };
      }),
      listHomeBigPictureGames: vi.fn(async () => {
        calls.push("big");
        await wave1;
        return [];
      }),
      listHomeUpcomingGames: vi.fn(async () => {
        calls.push("upcoming");
        await wave1;
        return [];
      }),
      readPromotedTgaSchedule: vi.fn(async () => {
        calls.push("tga");
        await wave1;
        return null;
      }),
      filterYearsWithPublicGoty: vi.fn(async (years: number[]) => {
        calls.push("years");
        await wave2;
        return years;
      }),
      listHomeTrendingGames: vi.fn(async () => {
        calls.push("trending");
        await wave2;
        return [];
      }),
      getGotyThroughRankForYears: vi.fn(async () => {
        calls.push("standings");
        return [];
      }),
    });

    const pending = loadHomePublic(loaders);
    await vi.waitFor(() => {
      expect(calls.slice().sort()).toEqual(["big", "settings", "tga", "upcoming"]);
    });
    releaseWave1();
    await vi.waitFor(() => {
      expect(calls).toEqual(
        expect.arrayContaining(["years", "trending"]),
      );
    });
    expect(calls).not.toContain("standings");
    releaseWave2();
    const result = await pending;
    expect(calls).toContain("standings");
    expect(loaders.listHomeTrendingGames).toHaveBeenCalledWith({ minPeople: 5 });
    expect(result.standingsReady).toBe(true);
  });
});

async function fakeCacheMatch(): Promise<Response> {
  const caches = (globalThis as unknown as { caches?: { default?: Cache } })
    .caches;
  const hit = await caches?.default?.match(homePublicCacheRequest());
  if (!hit) throw new Error("expected cache entry");
  return hit;
}
