import { createDb, readCatalogGameCount } from "@thegamies/db";
import {
  matchWorkersCacheJson,
  putWorkersCacheJson,
} from "@/lib/cloudflare/workers-cache";
import {
  browseGames,
  GAMES_BROWSE_PAGE_SIZE,
  type BrowseGamesInput,
} from "@/lib/catalog";

/** Colo-local. A newly listed game changes catalogGameCount and misses. */
export const GAME_SEARCH_CACHE_MAX_AGE_SECONDS = 300;

/** List-editor typeahead page size. Hub search uses `GAMES_BROWSE_PAGE_SIZE + 1`. */
export const GAME_SEARCH_CACHE_LIMIT = 24;

export type GameSearchCacheKeyInput = {
  q: string;
  year?: number;
  yearAtMost?: number;
  yearAtLeast?: number;
  yearKnownAtLeast?: number;
  sort: string;
  sortDir: string;
  releaseStatus: string;
  excludeEditions?: boolean;
  gotyEligibleTypes?: boolean;
  includeDlcAddonType?: boolean;
  includeAdult?: boolean;
  limit: number;
  offset: number;
  catalogGameCount: number | null;
};

export function shouldCacheGameSearchQuery(q: string): boolean {
  return q.trim().length >= 2;
}

export function browseSearchCacheKeyInput(
  input: BrowseGamesInput,
  catalogGameCount: number | null,
): GameSearchCacheKeyInput {
  return {
    q: input.q?.trim() ?? "",
    year: input.year,
    yearAtMost: input.yearAtMost,
    yearAtLeast: input.yearAtLeast,
    yearKnownAtLeast: input.yearKnownAtLeast,
    sort: input.sort ?? "popularity",
    sortDir: input.sortDir ?? "desc",
    releaseStatus: input.releaseStatus ?? "all",
    excludeEditions: input.excludeEditions,
    gotyEligibleTypes: input.gotyEligibleTypes,
    includeDlcAddonType: input.includeDlcAddonType,
    includeAdult: input.includeAdult,
    limit: input.limit ?? GAMES_BROWSE_PAGE_SIZE,
    offset: input.offset ?? 0,
    catalogGameCount,
  };
}

export function gameSearchCacheRequest(input: GameSearchCacheKeyInput): Request {
  const params = new URLSearchParams();
  params.set("q", input.q.trim().toLowerCase());
  if (input.year != null && Number.isFinite(input.year)) {
    params.set("year", String(Math.floor(input.year)));
  }
  if (input.yearAtMost != null) params.set("ymax", String(input.yearAtMost));
  if (input.yearAtLeast != null) params.set("ymin", String(input.yearAtLeast));
  if (input.yearKnownAtLeast != null) {
    params.set("yknown", String(input.yearKnownAtLeast));
  }
  params.set("sort", input.sort);
  params.set("dir", input.sortDir);
  params.set("rs", input.releaseStatus);
  if (input.excludeEditions) params.set("ed", "1");
  if (input.gotyEligibleTypes) params.set("goty", "1");
  if (input.includeDlcAddonType) params.set("dlc", "1");
  if (input.includeAdult) params.set("adult", "1");
  params.set("limit", String(input.limit));
  params.set("offset", String(input.offset));
  if (input.catalogGameCount != null) {
    params.set("count", String(input.catalogGameCount));
  }
  return new Request(
    `https://thegamies.internal/cache/game-search?${params.toString()}`,
  );
}

export async function matchGameSearchHits<T>(
  input: GameSearchCacheKeyInput,
): Promise<T | null> {
  return matchWorkersCacheJson<T>(gameSearchCacheRequest(input));
}

export async function putGameSearchHits(
  input: GameSearchCacheKeyInput,
  value: unknown,
): Promise<void> {
  await putWorkersCacheJson(
    gameSearchCacheRequest(input),
    value,
    GAME_SEARCH_CACHE_MAX_AGE_SECONDS,
  );
}

/** Hub `/games?q=` and list-editor JSON. Skip cache when `q` is shorter than 2. */
export async function cachedBrowseGames(input: BrowseGamesInput) {
  const q = input.q?.trim() ?? "";
  if (!shouldCacheGameSearchQuery(q)) {
    return browseGames(input);
  }

  const catalogGameCount = await readCatalogGameCount(createDb());
  const cacheInput = browseSearchCacheKeyInput(
    { ...input, q },
    catalogGameCount,
  );
  const hit = await matchGameSearchHits<Awaited<ReturnType<typeof browseGames>>>(
    cacheInput,
  );
  if (hit) return hit;

  const rows = await browseGames({ ...input, q });
  await putGameSearchHits(cacheInput, rows);
  return rows;
}
